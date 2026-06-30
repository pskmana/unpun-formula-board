const PROJECTS_SHEET = 'Projects';
const LOGS_SHEET = 'ProjectLogs';
const REQUESTS_SHEET = 'StatusRequests';
const USERS_SHEET = 'Users';
const STAGES_SHEET = 'StageOptions';
const STAGES = ['รับโจทย์', 'พัฒนาสูตร', 'รออนุมัติ', 'ส่งมอบ', 'สิ้นสุดโปรเจค'];
const PROJECT_HEADERS = ['ProjectID', 'ProjectName', 'ClientName', 'ContactName', 'CustomerAddress', 'CustomerPhone', 'BriefMoq', 'BriefBudget', 'BriefSize', 'BriefTexture', 'BriefScent', 'BriefColor', 'BriefExtracts', 'BriefAvoid', 'BriefConcept', 'Brief', 'DateReceived', 'DueDate', 'Stage', 'LastUpdated', 'Owner'];
const BRIEF_HEADERS = ['BriefMoq', 'BriefBudget', 'BriefSize', 'BriefTexture', 'BriefScent', 'BriefColor', 'BriefExtracts', 'BriefAvoid', 'BriefConcept', 'Brief'];
const LOG_HEADERS = ['ProjectID', 'Date', 'Note', 'Image', 'Owner', 'CreatedAt'];
const REQUEST_HEADERS = ['RequestID', 'ProjectID', 'FromStage', 'ToStage', 'RequestedBy', 'RequestedAt', 'Status', 'ApprovedBy', 'ApprovedAt'];
const USER_HEADERS = ['Username', 'PasswordHash', 'Role', 'CustomerPhone', 'CreatedAt'];

function doGet() {
  return json_({ error: 'POST login required' });
}

function doPost(e) {
  setupSheets_();
  const body = JSON.parse((e.postData && e.postData.contents) || '{}');
  const action = String(body.action || '').toLowerCase();

  if (action === 'customerlookup') {
    return json_({ projects: customerProjects_(body.CustomerPhone) });
  }

  if (action === 'login') {
    if (!listUsers_().length && body.Username && body.PasswordHash) {
      saveUser_({ Username: body.Username, PasswordHash: body.PasswordHash, Role: 'MD', CustomerPhone: '' });
    }
    const user = findUser_(body.Username, body.PasswordHash);
    if (!user) return json_({ error: 'unauthorized' });
    return json_({ user: publicUser_(user), projects: visibleProjects_(user), users: canManageUsers_(user) ? listUsers_().map(publicUser_) : [] });
  }

  const user = findUser_(body.AuthUsername, body.AuthPasswordHash);
  if (!user) return json_({ error: 'unauthorized' });

  if (action === 'list') return json_({ projects: visibleProjects_(user), users: canManageUsers_(user) ? listUsers_().map(publicUser_) : [] });
  if (action === 'saveproject' && canManageProjects_(user)) return json_({ ok: true, project: saveProject_(body) });
  if (action === 'deleteproject' && canManageProjects_(user)) return json_({ ok: true, deleted: deleteProject_(body.ProjectID) });
  if (action === 'savebrief' && canEditBrief_(user)) return json_({ ok: true, project: saveBrief_(body.ProjectID, body) });
  if (action === 'saveuser' && canCreateRole_(user, body.Role)) return json_({ ok: true, user: publicUser_(saveUser_(body)) });
  if (action === 'addlog' && canLog_(user)) return json_({ ok: true, project: addLog_(body, user) });
  if (action === 'movestage' && canMoveTo_(user, body.Stage)) return json_({ ok: true, project: moveStage_(body.ProjectID, body.Stage) });
  if (action === 'requeststatus' && role_(user) === 'MM') return json_({ ok: true, project: addStatusRequest_(body, user) });
  if (action === 'approvestatusrequest') return json_({ ok: true, project: approveStatusRequest_(body.ProjectID, body.RequestID, user) });
  return json_({ error: 'forbidden' });
}

function setupSheets_() {
  const ss = SpreadsheetApp.getActive();
  ensureHeaders_(ss.getSheetByName(PROJECTS_SHEET) || ss.insertSheet(PROJECTS_SHEET), PROJECT_HEADERS);
  ensureHeaders_(ss.getSheetByName(LOGS_SHEET) || ss.insertSheet(LOGS_SHEET), LOG_HEADERS);
  ensureHeaders_(ss.getSheetByName(REQUESTS_SHEET) || ss.insertSheet(REQUESTS_SHEET), REQUEST_HEADERS);
  ensureHeaders_(ss.getSheetByName(USERS_SHEET) || ss.insertSheet(USERS_SHEET), USER_HEADERS);
  const stages = ss.getSheetByName(STAGES_SHEET) || ss.insertSheet(STAGES_SHEET);
  if (stages.getLastRow() === 0) {
    stages.appendRow(['Stage']);
    STAGES.forEach(stage => stages.appendRow([stage]));
  } else {
    const existing = stages.getRange(1, 1, stages.getLastRow(), 1).getValues().flat();
    STAGES.forEach(stage => {
      if (existing.indexOf(stage) === -1) stages.appendRow([stage]);
    });
  }
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) return sheet.appendRow(headers);
  const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  headers.forEach(header => {
    if (current.indexOf(header) === -1) sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
  });
}

function canManageProjects_(user) {
  return ['MM', 'MD'].indexOf(role_(user)) !== -1;
}
function canManageUsers_(user) {
  return ['RD', 'MM', 'MD'].indexOf(role_(user)) !== -1;
}
function canEditBrief_(user) {
  return ['RD', 'MM'].indexOf(role_(user)) !== -1;
}
function canCreateRole_(user, role) {
  const currentRole = role_(user);
  if (currentRole === 'RD') return role === 'CS';
  if (currentRole === 'MM') return ['RD', 'CS'].indexOf(role) !== -1;
  if (currentRole === 'MD') return ['CS', 'RD', 'MM', 'MD'].indexOf(role) !== -1;
  return false;
}
function canLog_(user) {
  return ['RD', 'MM'].indexOf(role_(user)) !== -1;
}
function canMoveTo_(user, stage) {
  const currentRole = role_(user);
  if (currentRole === 'RD') return stage !== 'สิ้นสุดโปรเจค';
  if (currentRole === 'MM') return stage !== 'สิ้นสุดโปรเจค';
  if (currentRole === 'MD') return stage === 'สิ้นสุดโปรเจค';
  return false;
}

function role_(user) {
  const role = String((user && user.Role) || '').toLowerCase();
  return { customer: 'CUSTOMER', rd: 'RD', manager: 'MM', md: 'MD', cs: 'CS', mm: 'MM' }[role] || String((user && user.Role) || '').toUpperCase();
}

function findUser_(username, passwordHash) {
  return listUsers_().find(user => user.Username === username && user.PasswordHash === passwordHash) || null;
}
function listUsers_() {
  return readRows_(USERS_SHEET);
}
function publicUser_(user) {
  return { Username: user.Username, PasswordHash: user.PasswordHash, Role: role_(user), CustomerPhone: user.CustomerPhone || '' };
}
function saveUser_(user) {
  if (!user.Username || !user.PasswordHash) throw new Error('Username and PasswordHash are required');
  writeRow_(USERS_SHEET, USER_HEADERS, 'Username', user.Username, { ...user, CreatedAt: new Date() });
  return readRows_(USERS_SHEET).find(row => row.Username === user.Username);
}

function visibleProjects_(user) {
  const rows = listProjects_();
  return rows;
}
function customerProjects_(phone) {
  const normalized = normalizePhone_(phone);
  return listProjects_().filter(project => normalized && normalizePhone_(project.CustomerPhone) === normalized);
}
function listProjects_() {
  const logs = groupByProject_(readRows_(LOGS_SHEET), 'Date');
  const requests = groupByProject_(readRows_(REQUESTS_SHEET), 'RequestedAt');
  return readRows_(PROJECTS_SHEET).map(project => ({
    ...project,
    DaysLeft: daysLeft_(project.DueDate),
    Logs: logs[project.ProjectID] || [],
    Requests: requests[project.ProjectID] || []
  })).sort((a, b) => a.DaysLeft - b.DaysLeft);
}
function saveProject_(project) {
  writeRow_(PROJECTS_SHEET, PROJECT_HEADERS, 'ProjectID', project.ProjectID, { ...project, LastUpdated: new Date() });
  return listProjects_().find(row => row.ProjectID === project.ProjectID);
}
function deleteProject_(projectId) {
  const ss = SpreadsheetApp.getActive();
  [PROJECTS_SHEET, LOGS_SHEET, REQUESTS_SHEET].forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    let row = findRow_(sheet, 'ProjectID', projectId);
    while (row) {
      sheet.deleteRow(row);
      row = findRow_(sheet, 'ProjectID', projectId);
    }
  });
  return projectId;
}
function saveBrief_(projectId, brief) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(PROJECTS_SHEET);
  const row = findRow_(sheet, 'ProjectID', projectId);
  if (!row) throw new Error('Project not found');
  BRIEF_HEADERS.forEach(header => sheet.getRange(row, col_(sheet, header)).setValue(brief[header] || ''));
  sheet.getRange(row, col_(sheet, 'LastUpdated')).setValue(new Date());
  return listProjects_().find(project => project.ProjectID === projectId);
}
function moveStage_(projectId, stage) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(PROJECTS_SHEET);
  const row = findRow_(sheet, 'ProjectID', projectId);
  if (!row) throw new Error('Project not found');
  sheet.getRange(row, col_(sheet, 'Stage')).setValue(stage);
  sheet.getRange(row, col_(sheet, 'LastUpdated')).setValue(new Date());
  return listProjects_().find(project => project.ProjectID === projectId);
}
function addLog_(log, user) {
  SpreadsheetApp.getActive().getSheetByName(LOGS_SHEET).appendRow([log.ProjectID, log.Date || new Date(), log.Note, log.Image || '', user.Username, new Date()]);
  return listProjects_().find(project => project.ProjectID === log.ProjectID);
}
function addStatusRequest_(request, user) {
  if (request.ToStage !== 'สิ้นสุดโปรเจค') throw new Error('MM requests are for final stage only');
  SpreadsheetApp.getActive().getSheetByName(REQUESTS_SHEET).appendRow([
    request.RequestID || Utilities.getUuid(),
    request.ProjectID,
    request.FromStage || '',
    request.ToStage,
    user.Username,
    new Date(),
    'Pending',
    '',
    ''
  ]);
  return listProjects_().find(project => project.ProjectID === request.ProjectID);
}
function approveStatusRequest_(projectId, requestId, user) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(REQUESTS_SHEET);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const index = values.findIndex((row, i) => i > 0 && row[headers.indexOf('RequestID')] === requestId && row[headers.indexOf('ProjectID')] === projectId);
  if (index < 0) throw new Error('Request not found');
  const toStage = values[index][headers.indexOf('ToStage')];
  if (toStage === 'สิ้นสุดโปรเจค' && role_(user) !== 'MD') throw new Error('Only MD can approve final stage');
  if (toStage !== 'สิ้นสุดโปรเจค' && role_(user) !== 'MM') throw new Error('Only MM can approve stage changes');
  sheet.getRange(index + 1, col_(sheet, 'Status')).setValue('Approved');
  sheet.getRange(index + 1, col_(sheet, 'ApprovedBy')).setValue(user.Username);
  sheet.getRange(index + 1, col_(sheet, 'ApprovedAt')).setValue(new Date());
  return moveStage_(projectId, toStage);
}

function readRows_(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.filter(row => row.some(Boolean)).map(row => Object.fromEntries(headers.map((header, i) => [header, normalizeCell_(row[i])])));
}
function writeRow_(sheetName, headers, keyHeader, keyValue, data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const row = findRow_(sheet, keyHeader, keyValue) || sheet.getLastRow() + 1;
  headers.forEach(header => sheet.getRange(row, col_(sheet, header)).setValue(data[header] || ''));
}
function findRow_(sheet, keyHeader, keyValue) {
  const values = sheet.getDataRange().getValues();
  const keyIndex = values[0].indexOf(keyHeader);
  const index = values.findIndex((row, i) => i > 0 && row[keyIndex] === keyValue);
  return index < 0 ? null : index + 1;
}
function col_(sheet, header) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].indexOf(header) + 1;
}
function groupByProject_(rows, sortField) {
  return rows.sort((a, b) => String(b[sortField]).localeCompare(String(a[sortField]))).reduce((out, row) => {
    (out[row.ProjectID] ||= []).push(row);
    return out;
  }, {});
}
function daysLeft_(dueDate) {
  if (!dueDate) return 9999;
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((new Date(due.getFullYear(), due.getMonth(), due.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}
function normalizeCell_(value) {
  return value instanceof Date ? Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd') : value;
}
function normalizePhone_(phone) {
  return String(phone || '').replace(/\D/g, '');
}
function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
