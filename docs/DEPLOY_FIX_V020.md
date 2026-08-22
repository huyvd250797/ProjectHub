# V0.2.0 Deploy Hotfix — ExcelJS Buffer type

## Lỗi Vercel

```text
lib/import/workbook.ts(90,28): error TS2345:
Argument of type 'Buffer<ArrayBufferLike>' is not assignable to parameter of type 'Buffer'.
```

## Nguyên nhân

ExcelJS 4.4.0 có khai báo type cho `xlsx.load()` không tương thích hoàn toàn với kiểu generic Buffer mới của Node/@types khi TypeScript kiểm tra production build.

## Fix áp dụng

### `app/api/import/dry-run/route.ts`

Trước:

```ts
const buffer = Buffer.from(await file.arrayBuffer());
const result = await inspectAscWorkingWorkbook(buffer, file.name);
```

Sau:

```ts
const arrayBuffer = await file.arrayBuffer();
const result = await inspectAscWorkingWorkbook(arrayBuffer, file.name);
```

### `lib/import/workbook.ts`

Trước:

```ts
buffer: Buffer
```

Sau:

```ts
buffer: ArrayBuffer
```

ExcelJS/JSZip có thể đọc ArrayBuffer trực tiếp nên không cần tạo Node Buffer trung gian.

## Phạm vi

Đây là hotfix deploy của V0.2.0, không thay đổi database, Supabase user, RLS hoặc nghiệp vụ Import POC.
