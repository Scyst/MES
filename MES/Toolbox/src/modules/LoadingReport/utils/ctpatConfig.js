/**
 * Official C-TPAT 10-Point Inspection & 16-Point Photo Grid configuration helpers.
 */

export const CTPAT_PHOTO_POINTS = [
  { key: 'cargo_top_1', label: 'Pre-Load: Top 1 (สภาพสินค้า ด้านบน 1)', claimOptional: true },
  { key: 'cargo_top_2', label: 'Pre-Load: Top 2 (สภาพสินค้า ด้านบน 2)', claimOptional: true },
  { key: 'cargo_left', label: 'Pre-Load: Left Side (สภาพสินค้า ด้านซ้าย)', claimOptional: true },
  { key: 'cargo_right', label: 'Pre-Load: Right Side (สภาพสินค้า ด้านขวา)', claimOptional: true },
  { key: 'undercarriage', label: 'Gate Pass (ใบผ่าน รปภ.)' },
  { key: 'outside_door', label: 'Seal Condition (สภาพซีล)' },
  { key: 'right_side', label: 'Container No. (เบอร์ตู้)' },
  { key: 'left_side', label: 'Empty Container (ตู้เปล่า)' },
  { key: 'floor_moisture', label: 'Floor Moisture (ความชื้นพื้นตู้)' },
  { key: 'front_wall', label: 'Half Loaded (ครึ่งตู้)' },
  { key: 'cargo_moisture', label: 'Cargo Moisture (ความชื้นสินค้า)' },
  { key: 'ceiling_roof', label: 'Full Loaded (เต็มตู้)' },
  { key: 'floor', label: 'Right Door Closed (ปิดขวา)' },
  { key: 'inside_empty', label: 'All Doors Closed (ปิด 2 ฝั่ง)' },
  { key: 'inside_loaded', label: 'Seal Lock (ล็อคซีล)' },
  { key: 'seal_lock', label: 'Shipping Doc (ใบของออก)' },
];

export const CTPAT_CHECKLIST_SECTIONS = [
  {
    id: 1,
    title: 'Undercarriage (ใต้ท้องรถ)',
    officialTitle: 'Undercarriage before entering facility (ใต้ท้องรถ ก่อนเข้าพื้นที่)',
    officialNote: 'Do not let the container enter the facility, Use a mirror to access hard-to-see areas. ไม่อนุญาตให้นำตู้คอนเทนเนอร์เข้ามาในพื้นที่ และให้ใช้กระจกเพื่อตรวจสอบบริเวณที่เข้าถึงยาก',
    items: [
      'Support beams are visible (คานรับน้ำหนักมองเห็นชัดเจน)',
      'Wheels and tires look normal (ล้อและยางดูปกติ)',
    ],
  },
  {
    id: 2,
    title: 'Doors Inside/Outside (ประตู - ใน/นอก)',
    officialTitle: 'Doors Inside/Outside (ประตู - ด้านใน/ด้านนอก)',
    items: [
      'Ribs of doors are visible (ขอบประตูด้านในมองเห็นชัดเจน)',
      'Secure and reliable locking mechanisms (กลไกการล็อคแน่นหนา)',
      'Different color bonding material (วัสดุเชื่อม/หมุดย้ำ สีผิดปกติหรือไม่)',
      'Loose bolts (น็อตหรือเกลียวปล่อยหลวม/หาย)',
      'Hole / Cut (มีรู หรือรอยตัดเจาะ)',
      'Rusty (มีสนิมเกาะกินโครงสร้าง)',
    ],
  },
  {
    id: 3,
    title: 'Right Side (ผนังด้านขวา)',
    officialTitle: 'Right Side (ผนังด้านขวา)',
    items: [
      'Repairs to walls visible on outside (รอยซ่อมจากด้านใน ต้องเห็นร่องรอยด้านนอก)',
      'Visible ribs on the interior side of each door (ผนังประตูด้านในแต่ละด้านควรมีตัวดาม)',
      'Tap side walls for hollow sound (เคาะผนังเช็คเสียงกลวง/ผนังซ้อน)',
      'Unusual repairs to structural beams (การซ่อมแซมคานที่ดูผิดปกติ)',
      'Different color bonding material (วัสดุเชื่อมสีผิดปกติ)',
      'Loose bolts (น็อตหรือเกลียวปล่อยหลวม/หาย)',
      'Hole / Cut (มีรู หรือรอยตัดเจาะ)',
      'Dented (รอยบุบ/บิดเบี้ยวรุนแรง)',
      'Rusty (มีสนิม)',
    ],
  },
  {
    id: 4,
    title: 'Left Side (ผนังด้านซ้าย)',
    officialTitle: 'Left Side (ผนังด้านซ้าย)',
    items: [
      'Repairs to walls visible on outside (รอยซ่อมจากด้านใน ต้องเห็นร่องรอยด้านนอก)',
      'Visible ribs on the interior side of each door (ผนังประตูด้านในแต่ละด้านควรมีตัวดาม)',
      'Tap side walls for hollow sound (เคาะผนังเช็คเสียงกลวง/ผนังซ้อน)',
      'Unusual repairs to structural beams (การซ่อมแซมคานที่ดูผิดปกติ)',
      'Different color bonding material (วัสดุเชื่อมสีผิดปกติ)',
      'Loose bolts (น็อตหรือเกลียวปล่อยหลวม/หาย)',
      'Hole / Cut (มีรู หรือรอยตัดเจาะ)',
      'Dented (รอยบุบ/บิดเบี้ยวรุนแรง)',
      'Rusty (มีสนิม)',
    ],
  },
  {
    id: 5,
    title: 'Front Wall (ผนังด้านหน้า)',
    officialTitle: 'Front Wall (ผนังด้านหน้า)',
    items: [
      'Use a measuring tape or string to determine the length of container (ใช้ตลับเมตรวัดความยาวตู้)',
      'Blocks and vents are visible (เห็นช่องระบายอากาศและบล็อกกันกระแทกชัดเจน)',
      'Tap front wall. Listen/feel for a hollow sound (เคาะผนังเช็คเสียงกลวง/ผนังซ้อน)',
    ],
  },
  {
    id: 6,
    title: 'Ceiling / Roof (เพดาน / หลังคา)',
    officialTitle: 'Ceiling / Roof (เพดาน / หลังคา)',
    note: 'False compartments are common in ceilings, beams, floors, doors and the front wall. If unable to see roof of container, use ladder or a mirror attached to a pole\nช่องลับมักพบได้ในเพดาน, คาน, พื้น, ประตู และผนังด้านหน้า หากไม่สามารถมองเห็นหลังคาของตู้คอนเทนเนอร์ได้ ให้ใช้บันไดหรือกระจกที่ติดปลายไม้',
    items: [
      'Ceiling is a certain height from floor (เพดานมีความสูงจากพื้นตามที่กำหนด)',
      'Repairs to the ceiling on the inside of the container must be visible on the outside (การซ่อมแซมรอยเชื่อมด้านในต้องเห็นด้านนอก)',
      'Blocks and vents are visible (บล็อคและช่องระบายอากาศสามารถมองเห็นได้)',
      'Support beams are visible (คานรองรับสามารถมองเห็นได้)',
      'Tap ceiling/roof. Listen/feel for a hollow sound (เคาะเพดานเช็คเสียงกลวง)',
      'Uncomfortable feeling inside (ด้านในคอนเทนเนอร์โปร่ง ไม่อับ)',
      'Hole / Cut (มีรู หรือรอยตัดเจาะ)',
      'Dented (รอยบุบ/บิดเบี้ยวรุนแรง)',
      'Rusty (มีสนิม)',
    ],
  },
  {
    id: 7,
    title: 'Floor (พื้นตู้)',
    officialTitle: 'Floor (พื้นตู้)',
    note: 'Floor should be flat. Do not need to step up to get inside. พื้นควรเรียบเสมอกัน ไม่ควรมีพื้นยกระดับ',
    items: [
      'Floor a regulated height from ceiling (วัดความสูงระหว่างพื้นและเพดานปกติ)',
      'Clean (พื้นผิวสะอาดและเรียบร้อย)',
      'Dry (พื้นแห้ง ไม่มีรอยเปื้อนหรือคราบน้ำ)',
      'Different floor heights (พื้นเรียบเสมอกัน ไม่มีรอยนูน)',
      'Unusual repairs (ไม่มีรอยซ่อมพื้นผิดปกติ)',
      'Oil stain (ไม่มีคราบน้ำมัน)',
    ],
  },
  {
    id: 8,
    title: 'Door Lock (การล็อคประตู)',
    officialTitle: 'Door Lock (การล็อคประตู)',
    items: [
      'Doors completely seal when closed (ประตูคอนเทนเนอร์ปิดสนิท)',
      'Hinges are secure and reliable (บานพับแน่นหนาและมั่นคง)',
      'Bar of each door is working properly (คานประตู/ตัวล็อค ทำงานได้ปกติ)',
      'Problems locking door (กลอนประตูไม่มีปัญหาในการล็อค)',
    ],
  },
  {
    id: 9,
    title: 'Seal Verification (ตรวจสอบซีล)',
    officialTitle: 'Seal Verification (ตรวจสอบซีล)',
    items: [
      'Seal meets or exceeds PAS ISO 17712 (ซีลได้มาตรฐาน ISO 17712)',
      'Ensure Seal is not broken/damaged (ซีลไม่ชำรุดหรือเสียหาย)',
      'Verify seal number accuracy (เลขซีลตรงกับเอกสาร)',
      'Tug seal to make sure it is properly affixed (ดึงซีลเพื่อตรวจสอบความแน่นหนา)',
      'Twist and turn seal to make sure it does not unscrew (บิดหมุนซีลยืนยันว่าไม่คลาย)',
    ],
  },
  {
    id: 10,
    title: 'Agricultural Contaminants (สิ่งปนเปื้อน)',
    officialTitle: 'Agricultural Contaminants (สิ่งปนเปื้อน)',
    items: [
      'No Visible agricultural contaminants such as insects, pests, dirt, plant, or animal matter (ไม่มีสิ่งปนเปื้อนทางการเกษตร แมลง ดิน พืช สัตว์)',
    ],
  },
];

export const TOTAL_CTPAT_ITEMS = CTPAT_CHECKLIST_SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

/** Resizes uploaded container inspection images client-side before sending to PHP API. */
export const compressInspectionImage = (file, maxWidth = 1280, quality = 0.8) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) reject(new Error('ไม่สามารถบีบอัดไฟล์ภาพได้'));
            else resolve(blob);
          },
          'image/jpeg',
          quality,
        );
      };
      img.onerror = () => reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    reader.readAsDataURL(file);
  });

export const mapContainerTypeForPrint = (raw) => {
  const clean = String(raw || '').trim();
  const map = { '20GP': "20'", '40GP': "40'ST", '40HQ': "40'HC", '45HQ': "45'" };
  return map[clean] || clean;
};
