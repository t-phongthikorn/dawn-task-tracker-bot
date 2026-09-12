export function generateEpicId(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // ลบอักขระพิเศษออก เหลือเฉพาะตัวอักษร ตัวเลข และช่องว่าง
    .replace(/[\s_-]+/g, '-')   // เปลี่ยนช่องว่างเป็นเครื่องหมาย -
    .replace(/^-+|-+$/g, '');   // ตัด - ที่อยู่หัวท้ายออก

  const randomSuffix = Math.floor(1000 + Math.random() * 9000); // สุ่มเลข 4 หลัก (1000-9999)
  
  // หากชื่อเดิมมีแต่อักขระพิเศษจนโดนลบหมด ให้ใช้ 'epic' เป็นค่าเริ่มต้น
  return `${slug || 'epic'}-${randomSuffix}`;
}