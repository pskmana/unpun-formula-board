# UNPUN Formula Tracker

Single-page dashboard สำหรับ Track งานพัฒนาสูตรของ UNPUN INDUSTRY

เปิด `index.html` ได้ทันที ต้อง login ก่อนถึงจะเห็นข้อมูล ข้อมูล local จะเก็บในเครื่องผ่าน `localStorage`

## Google Sheets Schema

สร้าง Google Sheet แล้วมี 5 sheet:

`Projects`

```text
ProjectID, ProjectName, ClientName, ClientCode, ContactName, CustomerAddress, CustomerPhone, BriefMoq, BriefBudget, BriefSize, BriefTexture, BriefScent, BriefColor, BriefExtracts, BriefAvoid, BriefConcept, Brief, DateReceived, DueDate, Stage, LastUpdated, Owner
```

`StageOptions`

```text
Stage
รับโจทย์
พัฒนาสูตร
รออนุมัติ
ส่งมอบ
สิ้นสุดโปรเจค
```

`ProjectLogs`

```text
ProjectID, Date, Note, Image, Owner, CreatedAt
```

ใช้เก็บบันทึกรายวันว่า RD ทำอะไรไปแล้วบ้างในแต่ละโปรเจค

`StatusRequests`

```text
RequestID, ProjectID, FromStage, ToStage, RequestedBy, RequestedAt, Status, ApprovedBy, ApprovedAt
```

ใช้เก็บคำขอเปลี่ยน status และประวัติการ approve

`Users`

```text
Username, PasswordHash, Role, LineUserID, ClientCode, CustomerPhone, CreatedAt
```

ใช้เก็บ user ของ CS/RD/MM/MD/CLIENT โดยเก็บรหัสผ่านเป็น hash ไม่เก็บ password ตรง ๆ
`LineUserID` ใช้ผูกบัญชี LINE จาก LIFF กับ role จริง และ `ClientCode` ใช้กรอง project ของลูกค้า

## UX

- หน้าแรกหลัง login มี board + ปุ่ม `จัดการ` ปุ่มเดียว
- ลูกค้าพิมพ์เบอร์โทรที่ลงทะเบียนไว้เพื่อดู progress ได้โดยไม่ต้อง login
- ฟอร์มสร้างโปรเจค, สร้าง user, และ approve อยู่ในปุ่ม `จัดการ`
- การ์ดหน้า board แสดงเฉพาะรหัสโปรเจค, ชื่อโปรเจค, ชื่อลูกค้า
- รายละเอียดบรีฟต้องกดเข้าไปอ่าน และอ่านได้เฉพาะลูกค้าเจ้าของสูตร, RD เจ้าของโปรเจค, CS, MM, MD
- รายละเอียดบรีฟแยกหัวข้อ: MOQ, งบประมาณ, Product size, สัมผัส, กลิ่น, สี, สารสกัด, ข้อห้าม, คอนเซป, บรีฟเพิ่มเติม
- การ์ดลากข้ามช่อง status ได้ตามสิทธิ์ role
- RD/MM แก้ไขรายละเอียดบรีฟได้
- Log แนบรูปได้
- กดการ์ดเพื่อดูรายละเอียดลูกค้าและ RD daily log

## Role Flow

- Username format: `ชื่อจริงภาษาอังกฤษ.อักษรแรกนามสกุล.เลขท้ายเบอร์4ตัว` เช่น `Pongsakorn.M.3209`
- Default password format: `Role+เบอร์โทร` เช่น `MM0998213209`
- Roles: `CS`, `RD`, `MM`, `MD`
- CS: เห็นภาพรวมและอ่าน brief ได้
- RD: เห็นทุกโปรเจค, เพิ่ม RD log ได้, แนบรูปได้, แก้บรีฟได้, ลากการ์ดเปลี่ยน status ได้ ยกเว้น `สิ้นสุดโปรเจค`, สร้าง user ได้เฉพาะ CS
- MM: เห็นทุกโปรเจค, เพิ่ม log/แก้บรีฟได้, แก้/ลบข้อมูลโปรเจคได้, ลากการ์ดเปลี่ยน status ได้ยกเว้น `สิ้นสุดโปรเจค`; ถ้าลากไป `สิ้นสุดโปรเจค` จะสร้างคำขอให้ MD approve, สร้าง user ได้เฉพาะ RD/CS
- MD: เห็นภาพรวมทั้งหมด, แก้/ลบข้อมูลโปรเจคได้, approve คำขอจบงานเป็น `สิ้นสุดโปรเจค`, สร้าง user ได้ทุก role

Login แรกตอน `Users` ว่างจะสร้าง MD account จาก username/password ที่กรอก และเก็บ password เป็น SHA-256 hash

## Apps Script Sync

1. เปิด Google Sheet > Extensions > Apps Script
2. วางโค้ดจาก `google-apps-script.gs`
3. Deploy เป็น Web app
4. ตั้งค่า `Execute as: Me`
5. ตั้งค่า `Who has access: Anyone`
6. ใช้ URL ที่ลงท้าย `/exec`
7. ใส่ URL นั้นใน `index.html` ตรงบรรทัด `const API_URL = "";`

ถ้ายังไม่ใส่ `API_URL` เว็บจะทำงานแบบ local-only ต่อไป

## LINE OA / LIFF

เว็บนี้พร้อมเปิดผ่าน Rich menu ของ LINE OA ได้แล้ว

1. Deploy หน้า `index.html` ไปเป็น URL แบบ `https://...` ก่อน เพราะ LIFF ใช้กับ `file://` ไม่ได้
2. ไปที่ LINE Developers > LIFF > Add LIFF app
3. ใส่ Endpoint URL เป็น URL ของเว็บนี้ และเปิด scope `profile`
4. LIFF ID ถูกตั้งไว้แล้วเป็น `2010490215-3QA1FCUe`
5. ใน Rich menu ให้ตั้ง action เป็น LIFF URL หรือ URL ของเว็บที่ผูก LIFF ไว้
6. ลูกค้ากด Rich menu แล้วกรอกเบอร์โทรที่ลงทะเบียนไว้เพื่อดู progress ได้เลย ครั้งถัดไปในเครื่องเดิมเว็บจะจำเบอร์และเปิด project ของลูกค้าให้อัตโนมัติ

พนักงาน CS/RD/MM/MD ยัง login ด้วย username/password เดิมผ่านหน้าเดียวกัน
