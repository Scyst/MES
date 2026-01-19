<?php
// page/loading/loading_config.php

// 1. Checklist แบบย่อ (สำหรับหน้าจอ Operator) - Index เริ่มที่ 0
function getCtpatChecklist() {
    return [
        1 => [
            'title' => 'Undercarriage (ใต้ท้องรถ)',
            'items' => [
                'Support beams are visible (คานรับน้ำหนักมองเห็นชัดเจน)',
                'Wheels and tires look normal (ล้อและยางดูปกติ)'
            ]
        ],
        2 => [
            'title' => 'Doors Inside/Outside (ประตู - ใน/นอก)',
            'items' => [
                'Ribs of doors are visible (ขอบประตูด้านในมองเห็นชัดเจน)',
                'Secure and reliable locking mechanisms (กลไกการล็อคแน่นหนา)',
                'Different color bonding material (วัสดุเชื่อม/หมุดย้ำ สีผิดปกติหรือไม่)',
                'Loose bolts (น็อตหรือเกลียวปล่อยหลวม/หาย)',
                'Hole / Cut (มีรู หรือรอยตัดเจาะ)',
                'Rusty (มีสนิมเกาะกินโครงสร้าง)'
            ]
        ],
        3 => [
            'title' => 'Right Side (ผนังด้านขวา)',
            'items' => [
                'Repairs to walls visible on outside (รอยซ่อมจากด้านใน ต้องเห็นร่องรอยด้านนอก)',
                'Visible ribs on the interior side of each door (ผนังประตูด้านในแต่ละด้านควรมีตัวดาม)',
                'Tap side walls for hollow sound (เคาะผนังเช็คเสียงกลวง/ผนังซ้อน)',
                'Unusual repairs to structural beams (การซ่อมแซมคานที่ดูผิดปกติ)',
                'Different color bonding material (วัสดุเชื่อมสีผิดปกติ)',
                'Loose bolts (น็อตหรือเกลียวปล่อยหลวม/หาย)',
                'Hole / Cut (มีรู หรือรอยตัดเจาะ)',
                'Dented (รอยบุบ/บิดเบี้ยวรุนแรง)',
                'Rusty (มีสนิม)'
            ]
        ],
        4 => [
            'title' => 'Left Side (ผนังด้านซ้าย)',
            'items' => [
                'Repairs to walls visible on outside (รอยซ่อมจากด้านใน ต้องเห็นร่องรอยด้านนอก)',
                'Visible ribs on the interior side of each door (ผนังประตูด้านในแต่ละด้านควรมีตัวดาม)',
                'Tap side walls for hollow sound (เคาะผนังเช็คเสียงกลวง/ผนังซ้อน)',
                'Unusual repairs to structural beams (การซ่อมแซมคานที่ดูผิดปกติ)',
                'Different color bonding material (วัสดุเชื่อมสีผิดปกติ)',
                'Loose bolts (น็อตหรือเกลียวปล่อยหลวม/หาย)',
                'Hole / Cut (มีรู หรือรอยตัดเจาะ)',
                'Dented (รอยบุบ/บิดเบี้ยวรุนแรง)',
                'Rusty (มีสนิม)'
            ]
        ],
        5 => [
            'title' => 'Front Wall (ผนังด้านหน้า)',
            'items' => [
                'Use a measuring tape or string to determine the length of container (ใช้ตลับเมตรวัดความยาวตู้)',
                'Blocks and vents are visible (เห็นช่องระบายอากาศและบล็อกกันกระแทกชัดเจน)',
                'Tap front wall. Listen/feel for a hollow sound (เคาะผนังเช็คเสียงกลวง/ผนังซ้อน)'
            ]
        ],
        6 => [
            'title' => 'Ceiling / Roof (เพดาน / หลังคา)',
            'note'  => "False compartments are common in ceilings, beams, floors, doors and the front wall. If unable to see roof of container, use ladder or a mirror attached to a pole\nช่องลับมักพบได้ในเพดาน, คาน, พื้น, ประตู และผนังด้านหน้า หากไม่สามารถมองเห็นหลังคาของตู้คอนเทนเนอร์ได้ ให้ใช้บันไดหรือกระจกที่ติดปลายไม้",
            'items' => [
                'Ceiling is a certain height from floor (เพดานมีความสูงจากพื้นตามที่กำหนด)',
                'Repairs to the ceiling on the inside of the container must be visible on the outside (การซ่อมแซมรอยเชื่อมด้านในต้องเห็นด้านนอก)',
                'Blocks and vents are visible (บล็อคและช่องระบายอากาศสามารถมองเห็นได้)',
                'Support beams are visible (คานรองรับสามารถมองเห็นได้)',
                'Tap ceiling/roof. Listen/feel for a hollow sound (เคาะเพดานเช็คเสียงกลวง)',
                'Uncomfortable feeling inside (ด้านในคอนเทนเนอร์โปร่ง ไม่อับ)',
                'Hole / Cut (มีรู หรือรอยตัดเจาะ)',
                'Dented (รอยบุบ/บิดเบี้ยวรุนแรง)',
                'Rusty (มีสนิม)'
            ]
        ],
        7 => [
            'title' => 'Floor (พื้นตู้)',
            'note'  => "Floor should be flat. Do not need to step up to get inside. พื้นควรเรียบเสมอกัน ไม่ควรมีพื้นยกระดับ",
            'items' => [
                'Floor a regulated height from ceiling (วัดความสูงระหว่างพื้นและเพดานปกติ)',
                'Clean (พื้นผิวสะอาดและเรียบร้อย)',
                'Dry (พื้นแห้ง ไม่มีรอยเปื้อนหรือคราบน้ำ)',
                'Different floor heights (พื้นเรียบเสมอกัน ไม่มีรอยนูน)',
                'Unusual repairs (ไม่มีรอยซ่อมพื้นผิดปกติ)',
                'Oil stain (ไม่มีคราบน้ำมัน)'
            ]
        ],
        8 => [
            'title' => 'Door Lock (การล็อคประตู)',
            'items' => [
                'Doors completely seal when closed (ประตูคอนเทนเนอร์ปิดสนิท)',
                'Hinges are secure and reliable (บานพับแน่นหนาและมั่นคง)',
                'Bar of each door is working properly (คานประตู/ตัวล็อค ทำงานได้ปกติ)',
                'Problems locking door (กลอนประตูไม่มีปัญหาในการล็อค)'
            ]
        ],
        9 => [
            'title' => 'Seal Verification (ตรวจสอบซีล)',
            'items' => [
                'Seal meets or exceeds PAS ISO 17712 (ซีลได้มาตรฐาน ISO 17712)',
                'Ensure Seal is not broken/damaged (ซีลไม่ชำรุดหรือเสียหาย)',
                'Verify seal number accuracy (เลขซีลตรงกับเอกสาร)',
                'Tug seal to make sure it is properly affixed (ดึงซีลเพื่อตรวจสอบความแน่นหนา)',
                'Twist and turn seal to make sure it does not unscrew (บิดหมุนซีลยืนยันว่าไม่คลาย)'
            ]
        ],
        10 => [
            'title' => 'Agricultural Contaminants (สิ่งปนเปื้อน)',
            'items' => [
                'No Visible agricultural contaminants such as insects, pests, dirt, plant, or animal matter (ไม่มีสิ่งปนเปื้อนทางการเกษตร แมลง ดิน พืช สัตว์)'
            ]
        ]
    ];
}

// 2. Checklist แบบเต็ม (สำหรับหน้า Print) - Index ต้องเริ่มที่ 0 เหมือนกัน!
// [FIXED] เอา Key 1=>, 2=> ออก เพื่อให้ Index ตรงกับตัวข้างบน (0, 1, 2...)
function getOfficialChecklist() {
    return [
        1 => [
            'title' => 'Undercarriage before entering facility (ใต้ท้องรถ ก่อนเข้าพื้นที่)',
            'note'  => "Do not let the container enter the facility, Use a mirror to access hard-to-see areas. ไม่อนุญาตให้นำตู้คอนเทนเนอร์เข้ามาในพื้นที่ และให้ใช้กระจกเพื่อตรวจสอบบริเวณที่เข้าถึงยาก",
            'items' => [
                "Support beams are visible. Solid plates should not cover the beams\nคานรับน้ำหนักมองเห็นชัดเจน แผ่นปิดทึบไม่ควรปิดบังคาน",
                "Wheels and tires look normal\nล้อและยางดูปกติ",
            ]
        ],
        2 => [
            'title' => 'Doors Inside/Outside (ประตู - ด้านใน/ด้านนอก)',
            'items' => [
                "Ribs of doors are visible. Solid plates should not cover standard container cavities\nซี่ประตูด้านในมองเห็นชัดเจน แผ่นปิดทึบไม่ควรปิดบังช่องว่างมาตรฐานของตู้คอนเทนเนอร์",
                "Secure and reliable locking mechanisms are attached to the container\nกลไกการล็อคแน่นหนาและเชื่อถือได้",
                "Different color bonding material\nวัสดุเชื่อม/หมุดย้ำ ชนิดและสีผิดปกติหรือไม่)",
                "Loose bolts\nมีการคลายตัวหรือหายไปของชิ้นส่วนยึดหริอไม่่ (หมุดย้ำ/สกรู/สลักเกลียว/น็อต)",
                "Hole / Cut\nตรวจสอบว่ามีรูหรือรอยฉีกขาดที่ผิดปกติหรือไม่ (ร่องรอยการรั่วไหล)",
                "Rusty\nตรวจสอบว่ามีสนิมเกาะกินโครงสร้างหรือไม่",
            ]
        ],
        3 => [
            'title' => 'Right Side (ผนังด้านขวา)',
            'items' => [
                "Repairs to walls on insied of container must be visible on outside\nการซ่อมแซมรอยเชื่อมใดๆบนผนังด้านในจะต้องมองเห็นได้จากผนังด้านนอก",
                "Visible ribs on the interior side of each door\nผนังประตูแต่ละด้านของตู้คอนเทนเนอร์ด้านในควรมีตัวดาม",
                "Tap side walls. Listen/feel for a hollow sound\nใช้เครื่องมือเคาะผนังเพื่อยืนยันว่ามีเสียงโลหะก้อง แสดงว่าไม่มีผนังปลอม)",
                "Unusual repairs to structural beams\nมีการซ่อมแซมคานที่ดูผิดปกติหรือไม่",
                "Different color bonding material\nวัสดุเชื่อม/หมุดย้ำ ชนิดและสีผิดปกติหรือไม่)",
                "Loose bolts\nมีการคลายตัวหรือหายไปของชิ้นส่วนยึดหริอไม่่ (หมุดย้ำ/สกรู/สลักเกลียว/น็อต)",
                "Hole / Cut\nตรวจสอบว่ามีรูหรือรอยฉีกขาดที่ผิดปกติหรือไม่ (ร่องรอยการรั่วไหล)",
                "Dented\nรอยบุบ/บิดเบี้ยวผิดปกติหรือไม่",
                "Rusty\nตรวจสอบว่ามีสนิมเกาะกินโครงสร้างหรือไม่",
            ]
        ],
        4 => [
            'title' => 'Left Side (ผนังด้านซ้าย)',
            'items' => [
                "Repairs to walls on insied of container must be visible on outside\nการซ่อมแซมรอยเชื่อมใดๆบนผนังด้านในจะต้องมองเห็นได้จากผนังด้านนอก",
                "Visible ribs on the interior side of each door\nผนังประตูแต่ละด้านของตู้คอนเทนเนอร์ด้านในควรมีตัวดาม",
                "Tap side walls. Listen/feel for a hollow sound\nใช้เครื่องมือเคาะผนังเพื่อยืนยันว่ามีเสียงโลหะก้อง แสดงว่าไม่มีผนังปลอม)",
                "Unusual repairs to structural beams\nมีการซ่อมแซมคานที่ดูผิดปกติหรือไม่",
                "Different color bonding material\nวัสดุเชื่อม/หมุดย้ำ ชนิดและสีผิดปกติหรือไม่)",
                "Loose bolts\nมีการคลายตัวหรือหายไปของชิ้นส่วนยึดหริอไม่่ (หมุดย้ำ/สกรู/สลักเกลียว/น็อต)",
                "Hole / Cut\nตรวจสอบว่ามีรูหรือรอยฉีกขาดที่ผิดปกติหรือไม่ (ร่องรอยการรั่วไหล)",
                "Dented\nรอยบุบ/บิดเบี้ยวผิดปกติหรือไม่",
                "Rusty\nตรวจสอบว่ามีสนิมเกาะกินโครงสร้างหรือไม่",
            ]
        ],
        5 => [
            'title' => 'Front Wall (ผนังด้านหน้า)',
            'items' => [
                "Use a measuring tape or string to determine the length of container.\nใช้ตลับเมตรหรือเชือกวัดขนาดภายใน ความยาวที่วัดได้ควรตรงกับข้อมูลจำเพาะที่ระบุไว้",
                "Blocks and vents are visible.\nบล็อคและช่องระบายอากาศสามารถมองเห็นได้",
                "Tap front wall. Listen/feel for a hollow sound\nใช้เครื่องมือเคาะผนังเพื่อยืนยันว่ามีเสียงโลหะก้อง แสดงว่าไม่มีผนังปลอม",
            ]
        ],
        6 => [
            'title' => 'Ceiling / Roof (เพดาน / หลังคา)',
            'note'  => "False compartments are common in ceilings, beams, floors, doors and the front wall. If unable to see roof of container, use ladder or a mirror attached to a pole\nช่องลับมักพบได้ในเพดาน, คาน, พื้น, ประตู และผนังด้านหน้า หากไม่สามารถมองเห็นหลังคาของตู้คอนเทนเนอร์ได้ ให้ใช้บันไดหรือกระจกที่ติดปลายไม้",
            'items' => [
                "Ceiling is a certain height from floor\nเพดานมีความสูงจากพื้นตามที่กำหนด",
                "Repairs to the ceiling on the inside of the container must be visible on the outside\nการซ่อมแซมรอยเชื่อมใดๆบนเพดานด้านในจะต้องมองเห็นได้จากเพดานด้านนอก",
                "Blocks and vents are visible.\nบล็อคและช่องระบายอากาศสามารถมองเห็นได้",
                "Support beams are visible.\nคานรองรับสามารถมองเห็นได้",
                "Tap ceiling/roof. Listen/feel for a hollow sound\nใช้เครื่องมือเคาะเพดาน/หลังคาเพื่อยืนยันว่ามีเสียงโลหะก้อง แสดงว่าไม่มีผนังปลอม",
                "Uncomfortable feeling inside\nด้านในคอนเทนเนอร์โปร่ง ไม่อับ",
                "Hole / Cut\nตรวจสอบว่ามีรูหรือรอยฉีกขาดที่ผิดปกติหรือไม่ (ร่องรอยการรั่วไหล)",
                "Dented\nรอยบุบ/บิดเบี้ยวผิดปกติหรือไม่",
                "Rusty\nตรวจสอบว่ามีสนิมเกาะกินโครงสร้างหรือไม่",
            ]
        ],
        7 => [
            'title' => 'Floor (พื้นตู้)',
            'note'  => "Floor should be flat. Do not need to step up to get inside. พื้นควรเรียบเสมอกัน ไม่ควรมีพื้นยกระดับ",
            'items' => [
                "Floor a regulated height from ceiling.\nวัดความสูงระหว่างพื้นและเพดาน ความสูงที่วัดได้ควรตรงกับข้อมูลจำเพาะที่ระบุไว้",
                "Clean\nพื้นผิวสะอาดและเรียบร้อย",
                "Dry\nพื้นแห้ง ไม่มีรอยเปื้อนหรือคราบน้ำ และเมื่อสัมผัสแล้วไม่รู้สึกเปียกชื้น",
                "Different floor heights\nพื้นเรียบเสมอกัน ไม่มีรอยนูนหรือตะปูที่ยื่นออกมา",
                "Unusual repairs\nไม่มีรอยซ่อมพื้นผิดปกติ",
                "Oil stain\nไม่มีคราบน้ำมัน",
            ]
        ],
        8 => [
            'title' => 'Door Lock (การล็อคประตู)',
            'items' => [
                "Doors completely seal when closed\nประตูคอนเทนเนอร์ปิดสนิท",
                "Hinges are secure and reliable\nบานพับแน่นหนาและมั่นคง",
                "Bar of each door is working properly\nทดสอบอุปกรณ์ล็อคประตูทั้งหมด และตรวจสอบให้แน่ใจว่าทำงานได้ปกติ (ตัวล็อค/ มือจับ/ กลอน ฯลฯ)",
                "Problems locking door\nกลอนประตูทำงานได้ปกติ ไม่มีปัญหาในการล็อค",
            ]
        ],
        9 => [
            'title' => 'Seal Verification (ตรวจสอบซีล)',
            'items' => [
                "Seal meets or exceeds PAS ISO 17712\nต้องใช้ซีลที่มีฟังก์ชันความปลอดภัยสูงและเป็นไปตามมาตรฐานซีล ISO 17712",
                "Ensure Seal is not broken/damaged\nซีลไม่ชำรุดหรือเสียหาย",
                "Verify seal number accuracy\nหมายเลขซีลต้องบันทึกในเอกสารการขนส่งสินค้าอย่างถูกต้อง",
                "Tug seal to make sure it is properly affixed\nออกแรงดึงและงัดซีลเพื่อตรวจสอบความแน่นหนา",
                "Twist and turn seal to make sure it does not unscrew\nลองบิดและหมุนซีลด้วยมือ เพื่อยืนยันว่าซีลไม่สามารถคลายเกลียวได้",
            ]
        ],
        10 => [
            'title' => 'Agricultural Contaminants (สิ่งปนเปื้อน)',
            'items' => [
                "No Visible agricultural contaminants such as insects, pests, dirt, plant, or animal matter\nไม่มีสิ่งปนเปื้อนทางการเกษตรที่มองเห็นได้ เช่น แมลง, ศัตรูพืช, ดิน, พืช, หรือสารอินทรีย์จากสัตว์",
            ]
        ],
    ];
}
?>