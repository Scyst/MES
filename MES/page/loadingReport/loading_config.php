<?php
// page/loading/loading_config.php

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
                'Measure length (วัดความยาวตู้ว่าสั้นผิดปกติหรือไม่)',
                'Blocks and vents are visible (เห็นช่องระบายอากาศและบล็อกกันกระแทกชัดเจน)',
                'Tap front wall for hollow sound (เคาะผนังเช็คเสียงกลวง/ผนังซ้อน)'
            ]
        ],
        6 => [
            'title' => 'Ceiling / Roof (เพดาน / หลังคา)',
            'items' => [
                'Ceiling is a certain height from floor (ความสูงเพดานปกติ)',
                'Repairs inside are visible outside (รอยซ่อมด้านในต้องเห็นด้านนอก)',
                'Blocks and vents are visible (เห็นช่องระบายอากาศชัดเจน)',
                'Support beams are visible (เห็นคานหลังคาชัดเจน)',
                'Tap side walls for hollow sound (เคาะผนังเช็คเสียงกลวง/ผนังซ้อน)',
                'No uncomfortable feeling inside (ไม่อึดอัด/อากาศถ่ายเทปกติ)',
                'Hole / Cut (มีรู หรือรอยตัดเจาะ)',
                'Dented (รอยบุบ/บิดเบี้ยวรุนแรง)',
                'Rusty (มีสนิม)'
            ]
        ],
        7 => [
            'title' => 'Floor (พื้นตู้)',
            'items' => [
                'Floor a regulated height from ceiling (ความสูงพื้นและเพดานปกติ)',
                'Clean(สะอาด)',
                'Dry (แห้ง)',
                'Different floor heights (ไม่มีพื้นยกระดับ)',
                'Unusual repairs (ไม่มีรอยซ่อมพื้นผิดปกติ)',
                'Oil stain (ไม่มีคราบน้ำมัน)'
            ]
        ],
        8 => [
            'title' => 'Door Lock (การล็อคประตู)',
            'items' => [
                'Doors completely seal when closed (ประตูปิดสนิท ซีลยางสภาพดี)',
                'Hinges are secure and reliable (บานพับแน่นหนาและมั่นคง)',
                'Bar of each door is working properly (คานประตูทำงานได้ปกติ)',
                'No problems locking door (ไม่มีปัญหาในการล็อค)'
            ]
        ],
        9 => [
            'title' => 'Seal Verification (ตรวจสอบซีล)',
            'items' => [
                'Seal meets ISO 17712 (ซีลได้มาตรฐาน ISO 17712)',
                'Seal is not broken/damaged (ซีลไม่แตกหักเสียหาย)',
                'Verify seal number accuracy (เลขซีลตรงกับเอกสาร)',
                'Tug test (ทดสอบการดึง)',
                'Twist test (ทดสอบการบิด)'
            ]
        ],
        10 => [
            'title' => 'Agricultural Contaminants (สิ่งปนเปื้อน)',
            'items' => [
                'No Visible agricultural contaminants (ไม่มีสิ่งปนเปื้อนทางการเกษตรที่มองเห็นได้)'
            ]
        ]
    ];
}
?>