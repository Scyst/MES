import React, { useState, useMemo } from 'react';
import { FiBookOpen, FiSearch, FiX, FiCheckCircle, FiInfo, FiTag, FiHash, FiCpu, FiLayers } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

/**
 * Master Industrial Acronyms & Formulas Dictionary
 * Complete engineering reference for Machine Vision & Edge AI
 */
export const INDUSTRIAL_GLOSSARY_DATA = [
  // =========================================================================
  // 1. Optics & Geometry (ทัศนศาสตร์และเรขาคณิต)
  // =========================================================================
  {
    category: 'optics',
    categoryName: 'ทัศนศาสตร์และเรขาคณิต (Optics & Geometry)',
    term: 'WD',
    fullEnglish: 'Working Distance',
    thaiName: 'ระยะทำงานของเลนส์',
    unit: 'มิลลิเมตร (mm)',
    meaning: 'ระยะห่างทางกายภาพที่วัดจากขอบหน้าสุดของเลนส์กล้อง (Front of Lens Barrel) ไปจนถึงพื้นผิวด้านบนของชิ้นงานเป้าหมายที่ต้องการโฟกัส',
    origin: 'วัดได้จริงหน้างานด้วยตลับเมตรหรือเวอร์เนียคาลิเปอร์ หรือกำหนดจากระยะติดตั้งทางกลของโครงสร้างเครื่องจักร (Machine Physical Clearance)',
    formula: 'WD = (f × FOV) / h โดย f คือทางยาวโฟกัส, h คือขนาดด้านกว้างของแผ่นเซนเซอร์',
    tip: 'หากระยะติดตั้งในตู้เครื่องจักรมีพื้นที่จำกัด (เช่น < 150 มม.) จะบังคับให้ต้องเลือกเลนส์มุมกว้าง (ทางยาวโฟกัสสั้น เช่น 8 มม. หรือ 12 มม.)'
  },
  {
    category: 'optics',
    categoryName: 'ทัศนศาสตร์และเรขาคณิต (Optics & Geometry)',
    term: 'FOV',
    fullEnglish: 'Field of View',
    thaiName: 'ขอบเขตการมองเห็นของกล้อง',
    unit: 'มิลลิเมตร (mm) หรือ องศา (°)',
    meaning: 'ขนาดความกว้างและความยาวของพื้นที่ระนาบชิ้นงานที่เซนเซอร์กล้องมองเห็นได้ใน 1 เฟรมภาพ (แบ่งเป็น Horizontal FOV และ Vertical FOV)',
    origin: 'คำนวณจากขนาดชิ้นงานที่ใหญ่ที่สุด บวกระยะเผื่อการวางชิ้นงานเอียงหรือเลื่อนขอบบนสายพาน (Safety Margin 15 - 20%)',
    formula: 'FOV_H = ชิ้นงานกว้างสุด (mm) + ขอบเผื่อความคลาดเคลื่อนสายพาน (Tolerance Margin mm)',
    tip: 'ห้ามตั้งค่า FOV พอดีกับตัวชิ้นงานเป๊ะ เพราะหากชิ้นงานเลื่อนขยับเพียงเล็กน้อย ขอบชิ้นงานจะหลุดเฟรม ทำให้ AI ตัดสินผิดพลาด'
  },
  {
    category: 'optics',
    categoryName: 'ทัศนศาสตร์และเรขาคณิต (Optics & Geometry)',
    term: 'DOF',
    fullEnglish: 'Depth of Field',
    thaiName: 'ระยะชัดลึกของภาพ',
    unit: 'มิลลิเมตร (mm)',
    meaning: 'ช่วงระยะทางตามแนวแกน Z (เข้าหาและออกจากหน้าเลนส์) ที่ชิ้นงานสามารถขยับขึ้นหรือลงได้โดยที่ภาพยังคงคมชัดอยู่ในเกณฑ์ที่ยอมรับได้',
    origin: 'ผันแปรตามขนาดรูรับแสงของเลนส์ (f-number หรือ F-stop), ทางยาวโฟกัส (f) และระยะทำงาน (WD)',
    formula: 'DOF ≈ 2 × (f-number) × c × (WD / f)² โดย c คือวงกระจายความพร่ามัว (Circle of Confusion ≈ 2 เท่าของขนาดพิกเซล)',
    tip: 'หากต้องการให้ระยะชัดลึกกว้างขึ้น (เช่น ชิ้นงานมีความหนาหลายระดับ) ให้หรี่รูรับแสงเลนส์ให้แคบลง (เพิ่มค่า f-stop เช่น จาก f/2.8 เป็น f/8) และชดเชยด้วยการเพิ่มความสว่างของไฟแฟลชสโตรบ'
  },
  {
    category: 'optics',
    categoryName: 'ทัศนศาสตร์และเรขาคณิต (Optics & Geometry)',
    term: 'f (Focal Length)',
    fullEnglish: 'Lens Focal Length',
    thaiName: 'ทางยาวโฟกัสของเลนส์',
    unit: 'มิลลิเมตร (mm)',
    meaning: 'ระยะห่างระหว่างจุดศูนย์กลางเชิงแสงของเลนส์ (Optical Center) ไปยังระนาบโฟกัสบนแผ่นชิปเซนเซอร์',
    origin: 'สเปกมาตรฐานของเลนส์อุตสาหกรรมในท้องตลาด เช่น 6mm, 8mm, 12mm, 16mm, 25mm, 35mm, 50mm, 75mm',
    formula: 'f = (h × WD) / FOV โดย h คือขนาดชิปเซนเซอร์ในแนวที่ต้องการคำนวณ (มม.)',
    tip: 'เมื่อคำนวณค่า f ได้ตัวเลขที่ไม่มีขายในตลาด ให้ปัดลงเป็นขนาดเลนส์ที่สั้นกว่าถัดไป เพื่อให้ได้ขอบเขตภาพที่กว้างขึ้น แล้วปรับระยะ WD หน้างานให้พอดี'
  },
  {
    category: 'optics',
    categoryName: 'ทัศนศาสตร์และเรขาคณิต (Optics & Geometry)',
    term: '3-Pixel Rule',
    fullEnglish: 'The Three-Pixel Inspection Rule',
    thaiName: 'กฎ 3 พิกเซลมาตรฐานการตรวจสอบ',
    unit: 'พิกเซล (Pixels)',
    meaning: 'เกณฑ์ความน่าเชื่อถือทางวิศวกรรมที่กำหนดว่า: ข้อบกพร่อง รอยตำหนิ หรือรูปร่างที่เล็กที่สุดที่ต้องการตรวจสอบ จะต้องมีขนาดครอบคลุมเซนเซอร์อย่างน้อย 3 พิกเซลขึ้นไป',
    origin: 'พัฒนาต่อยอดจากทฤษฎีการสุ่มตัวอย่างของไนควิสต์ (Nyquist-Shannon Sampling Theorem) ที่ต้องการอย่างน้อย 2 พิกเซลในการตรวจจับการเปลี่ยนแปลงระดับแสง (Edge Detection) บวกกับค่าเผื่อความปลอดภัยทางอุตสาหกรรม (Industrial Guardband 1 พิกเซล) เพื่อป้องกันสัญญาณรบกวน (Noise)',
    formula: 'Resolution_Min (mm/pixel) = ขนาดรอยตำหนิเล็กสุดที่ต้องตรวจ (mm) / 3 พิกเซล',
    tip: 'หากใช้เพียง 1-2 พิกเซล การสั่นสะเทือนของเครื่องจักรหรือฝุ่นละอองเพียงเม็ดเดียวจะทำให้ระบบเกิด False Alarm (เตะของดีทิ้ง) สูงถึง 30%'
  },
  {
    category: 'optics',
    categoryName: 'ทัศนศาสตร์และเรขาคณิต (Optics & Geometry)',
    term: 'ROI',
    fullEnglish: 'Region of Interest',
    thaiName: 'ขอบเขตพื้นที่สนใจเฉพาะส่วน',
    unit: 'พิกัดพิกเซล (x, y, w, h)',
    meaning: 'การกำหนดกรอบพื้นที่ย่อยบนเฟรมภาพ เพื่อส่งเฉพาะพิกเซลในบริเวณนั้นเข้าสู่อัลกอริทึมการประมวลผล แทนที่จะส่งภาพทั้งเฟรม',
    origin: 'การตั้งค่าบนฮาร์ดแวร์เซนเซอร์กล้อง (Sensor Hardware Crop) หรือผ่านซอฟต์แวร์ประมวลผล',
    formula: 'Memory Reduced (%) = (1 - (ROI_w × ROI_h) / (Full_w × Full_h)) × 100%',
    tip: 'การตั้งค่า ROI บนตัวกล้องโดยตรง (Hardware ROI) ช่วยลดปริมาณข้อมูลที่ส่งผ่านสายแลน GigE ทำให้กล้องสามารถถ่ายภาพได้ที่ความเร็วเฟรมเรต (FPS) สูงขึ้นถึง 2-5 เท่า'
  },
  {
    category: 'optics',
    categoryName: 'ทัศนศาสตร์และเรขาคณิต (Optics & Geometry)',
    term: 'CPL',
    fullEnglish: 'Circular Polarizer Lens Filter',
    thaiName: 'ฟิลเตอร์ตัดแสงสะท้อนโพลาไรซ์แบบวงกลม',
    unit: 'เกลียวฟิลเตอร์ (เช่น M25.5, M27, M30.5)',
    meaning: 'แผ่นกรองแสงออปติกที่ขันติดหน้ากระบอกเลนส์ ทำหน้าที่กรองคลื่นแสงที่สั่นในทิศทางที่ไม่ต้องการ ขจัดแสงสะท้อนจ้า (Glare / Specular Reflection)',
    origin: 'ทฤษฎีการสะท้อนโพลาไรเซชันของบรูว์สเตอร์ (Brewster\'s Angle)',
    formula: 'I_passed = I_0 × cos²(θ) (กฎของมาลุส Malus\'s Law)',
    tip: 'สำหรับชิ้นงานโลหะมันวาว โครเมียม หรือถุงพลาสติกสะท้อนแสง ให้ติดตั้ง CPL Filter หน้าเลนส์ ร่วมกับแผ่นฟิล์มโพลาไรเซอร์ (Polarizer Sheet) หน้าโคมไฟ LED โดยบิดทำมุม 90 องศา (Cross-Polarization) แสงสะท้อนจ้าจะหายไป 100%'
  },
  {
    category: 'optics',
    categoryName: 'ทัศนศาสตร์และเรขาคณิต (Optics & Geometry)',
    term: 'DPM',
    fullEnglish: 'Direct Part Marking',
    thaiName: 'การยิงบาร์โค้ดลงบนเนื้อชิ้นงานโดยตรง',
    unit: 'เกรดคุณภาพการอ่าน (ISO/IEC TR 29158 AIM DPM Grade A-F)',
    meaning: 'การสร้างรหัส 2D DataMatrix ลงบนเนื้อโลหะหรือพลาสติกโดยตรงด้วยเลเซอร์ (Laser Etching) หรือหัวตอกเข็ม (Dot Peen)',
    origin: 'มาตรฐานการสืบย้อนกลับระดับชิ้นส่วนในอุตสาหกรรมยานยนต์และอากาศยาน (Traceability Mandate)',
    formula: 'Contrast Ratio = (I_cell - I_background) / (I_cell + I_background)',
    tip: 'การอ่าน DPM บนผิวโลหะมันเงา ต้องใช้ไฟโดมแสงนุ่ม (Dome Light) หรือไฟแนวแกน (Coaxial Light) เท่านั้น หากใช้ไฟริงก์ธรรมดา แสงสะท้อนจากหลุมตอกจะทำให้เครื่องสแกนบาร์โค้ดอ่านไม่ติด'
  },
  {
    category: 'optics',
    categoryName: 'ทัศนศาสตร์และเรขาคณิต (Optics & Geometry)',
    term: 'Vignetting',
    fullEnglish: 'Optical Lens Vignetting',
    thaiName: 'ปรากฏการณ์ขอบภาพมืด',
    unit: 'เปอร์เซ็นต์ความสว่างที่ลดทอน (%)',
    meaning: 'อาการที่มุมทั้ง 4 ของภาพถ่ายมีความสว่างลดลงอย่างเห็นได้ชัดเมื่อเทียบกับบริเวณกึ่งกลางภาพ',
    origin: 'เกิดจากการเลือกขนาดวงภาพของเลนส์ (Image Circle) เล็กกว่าขนาดของแผ่นชิปเซนเซอร์ (Sensor Diagonal Size) ทำให้ขอบกระบอกเลนส์บังแสงไม่ให้ตกถึงมุมเซนเซอร์',
    formula: 'เกณฑ์ป้องกัน: เส้นผ่านศูนย์กลางวงภาพเลนส์ (Image Circle) ≥ เส้นทแยงมุมเซนเซอร์ (Sensor Diagonal)',
    tip: 'แก้ไขได้โดยเลือกเลนส์ที่มีฟอร์แมตขนาดเท่ากันหรือใหญ่กว่าเซนเซอร์เสมอ เช่น เซนเซอร์ขนาด 2/3 นิ้ว ต้องใช้เลนส์ขนาด 2/3 นิ้ว หรือ 1 นิ้วขึ้นไป ห้ามใช้เลนส์ขนาด 1/2 นิ้วเด็ดขาด'
  },
  {
    category: 'optics',
    categoryName: 'ทัศนศาสตร์และเรขาคณิต (Optics & Geometry)',
    term: 'Telecentricity',
    fullEnglish: 'Telecentric Optical System',
    thaiName: 'คุณสมบัติทัศนศาสตร์ขนานเทเลเซนทริก',
    unit: 'องศาความเบี่ยงเบน (< 0.05°)',
    meaning: 'เลนส์ออปติกที่มีการจัดวางกลุ่มเลนส์พิเศษ ทำให้ลำแสงนำเข้าทุกเส้นขนานแท้กับแกนลำกล้อง 90 องศาอย่างสมบูรณ์แบบ',
    origin: 'ทฤษฎีออปติกของ Ernst Abbe ที่วางทางผ่านของแสง (Aperture Stop) ไว้ที่ระนาบโฟกัสหลัง ขจัดมุมมองแบบกรวยตาปลา (Cone Perspective)',
    formula: 'Parallax Error ≈ 0 mm เมื่อชิ้นงานเลื่อนขึ้นหรือลงตามแนวแกน Z',
    tip: 'เลนส์ Telecentric มีขนาดกระบอกเลนส์ด้านหน้าใหญ่เท่ากับหรือใหญ่กว่าขนาดวัตถุเสมอ จึงเหมาะกับชิ้นงานขนาดเล็กถึงปานกลาง เช่น น็อต, สปริง, เพลา, และขั้วต่ออิเล็กทรอนิกส์'
  },

  // =========================================================================
  // 2. Camera & Sensor Hardware (กล้องและฮาร์ดแวร์เซนเซอร์)
  // =========================================================================
  {
    category: 'hardware',
    categoryName: 'ฮาร์ดแวร์กล้องและเซนเซอร์ (Camera & Hardware)',
    term: 'Global Shutter',
    fullEnglish: 'Global Shutter Exposure Architecture',
    thaiName: 'ชัตเตอร์เปิดรับแสงพร้อมกันทุกพิกเซล',
    unit: 'ไมโครวินาที (µs) / มิลลิวินาที (ms)',
    meaning: 'สถาปัตยกรรมเซนเซอร์ภาพที่ทุกๆ พิกเซลบนชิปจะเริ่มเปิดรับแสงและหยุดรับแสงพร้อมกันในเสี้ยววินาทีเดียวกัน 100%',
    origin: 'มีวงจรจัดเก็บประจุหน่วยความจำ (Analog Memory Cell) อยู่ข้างๆ ทุกโฟโต้ไดโอดบนชิป CMOS',
    formula: 'ภาพชิ้นงานคมกริบ ไม่บิดเบี้ยวแม้สายพานวิ่งด้วยความเร็ว 300 เมตร/นาที',
    tip: 'ในงานโรงงานอุตสาหกรรมที่มีชิ้นงานเคลื่อนที่บนสายพาน ต้องใช้กล้อง Global Shutter เท่านั้น ห้ามใช้ Rolling Shutter เด็ดขาด'
  },
  {
    category: 'hardware',
    categoryName: 'ฮาร์ดแวร์กล้องและเซนเซอร์ (Camera & Hardware)',
    term: 'Rolling Shutter',
    fullEnglish: 'Rolling Shutter Exposure Architecture',
    thaiName: 'ชัตเตอร์แบบกวาดทีละแถว',
    unit: 'ไมโครวินาที (µs)',
    meaning: 'สถาปัตยกรรมเซนเซอร์ที่เปิดรับแสงทีละแถวพิกเซลจากบนลงล่างตามลำดับเวลา ทำให้แถวล่างสุดถ่ายทีหลังแถวบนสุดหลายมิลลิวินาที',
    origin: 'เป็นเซนเซอร์ต้นทุนต่ำที่นิยมใช้ในโทรศัพท์มือถือและกล้องเว็บแคมทั่วไป',
    formula: 'เกิดอาการ Jello Effect / Skew Distortion เมื่อวัตถุเคลื่อนที่ผ่านหน้ากล้อง',
    tip: 'หากนำกล้อง Rolling Shutter ไปตรวจวัตถุหมุน (เช่น ใบพัด) ใบพัดจะบิดเบี้ยวโค้งงอ หรือบาร์โค้ดบนสายพานจะเอียงจนสแกนไม่ติด'
  },
  {
    category: 'hardware',
    categoryName: 'ฮาร์ดแวร์กล้องและเซนเซอร์ (Camera & Hardware)',
    term: 'MP',
    fullEnglish: 'Megapixels',
    thaiName: 'ล้านพิกเซล (ความละเอียดเซนเซอร์)',
    unit: 'ล้านพิกเซล (MP)',
    meaning: 'จำนวนพิกเซลประสาทรับแสงทั้งหมดบนแผ่นชิปเซนเซอร์',
    origin: 'ผลคูณของจำนวนพิกเซลแนวนอน (Pixels_H) กับจำนวนพิกเซลแนวตั้ง (Pixels_V) แล้วหารด้วย 1,000,000 (Mega = 10⁶)',
    formula: 'MP = (Pixels_Horizontal × Pixels_Vertical) / 1,000,000',
    tip: 'สเปกกล้องมาตรฐานในตลาด: 0.3 MP (640x480 VGA), 1.3 MP (1280x1024), 2.0 MP (1920x1080 Full HD), 5.0 MP (2448x2048), 12.0 MP (4096x3000)'
  },
  {
    category: 'hardware',
    categoryName: 'ฮาร์ดแวร์กล้องและเซนเซอร์ (Camera & Hardware)',
    term: 'Line Scan Camera',
    fullEnglish: 'Line Scan Industrial Camera',
    thaiName: 'กล้องสแกนภาพแนวเส้นระนาบเดี่ยว',
    unit: 'กิโลเฮิรตซ์ (Line Rate kHz: เช่น 40 kHz - 140 kHz)',
    meaning: 'กล้องที่มีเซนเซอร์รับภาพเพียง 1 แถวพิกเซล (เช่น 8,192 × 1 พิกเซล) ทำหน้าที่ถ่ายภาพทีละเส้นต่อกันตามจังหวะสัญญาณเอ็นโค้ดเดอร์สายพาน',
    origin: 'ออกแบบมาเพื่อตรวจจับวัสดุต่อเนื่อง (Continuous Web) ที่ไม่มีจุดสิ้นสุด เช่น แผ่นเหล็กม้วน, แผ่นฟิล์มแบตเตอรี่ EV, สิ่งทอ, แผ่นกระจก',
    formula: 'Total Image Width = 8,192 พิกเซล, ความยาวต่อเนื่องไม่จำกัด',
    tip: 'กล้อง Line Scan ต้องใช้ร่วมกับไฟ Bar Light สว่างต่อเนื่องความเข้มสูงมาก (High-Intensity LED Line Light) และต่อสัญญาณ Rotary Encoder เข้ากล้องเพื่อคุม Line Rate เสมอ'
  },
  {
    category: 'hardware',
    categoryName: 'ฮาร์ดแวร์กล้องและเซนเซอร์ (Camera & Hardware)',
    term: 'GigE Vision',
    fullEnglish: 'Gigabit Ethernet Industrial Vision Standard',
    thaiName: 'มาตรฐานการส่งภาพผ่านสายแลนกิกะบิต',
    unit: 'ความเร็ว 1,000 Mbps (1 Gbps)',
    meaning: 'มาตรฐานสากลของสมาคมแมชชีนวิชันโลก (AIA) สำหรับควบคุมกล้องและส่งข้อมูลภาพดิจิทัลผ่านสายแลน Cat6',
    origin: 'พัฒนาขึ้นเพื่อทดแทนระบบกล้อง Analog เดิมและสายไฟเบอร์ราคาแพง',
    formula: 'ระยะสายสัญญาณสูงสุด = 100 เมตร (โดยไม่ต้องใช้ตัวทวนสัญญาณ Repeater)',
    tip: 'รองรับมาตรฐาน PoE (Power over Ethernet) จ่ายไฟเลี้ยงกล้องผ่านสายแลนเส้นเดียวโดยไม่ต้องเดินสายไฟแยกต่างหาก'
  },
  {
    category: 'hardware',
    categoryName: 'ฮาร์ดแวร์กล้องและเซนเซอร์ (Camera & Hardware)',
    term: 'Hirose 12-Pin',
    fullEnglish: 'Hirose HR10A-10P-12S Industrial Connector',
    thaiName: 'ขั้วต่อสัญญาณฮาร์ดแวร์มาตรฐานกล้องอุตสาหกรรม',
    unit: '12 ขา (Pins)',
    meaning: 'ขั้วต่อชนิดกลมแบบขันเกลียวล็อกกันน้ำกันสะเทือน สำหรับส่งสัญญาณฮาร์ดแวร์ทริกเกอร์ (Opto-Isolated Trigger In) และสัญญาณส่งไฟแฟลชสโตรบ (Strobe Out)',
    origin: 'มาตรฐานตัวเชื่อมต่อของบริษัท Hirose Electric ประเทศญี่ปุ่น นิยมใช้ในกล้อง Basler, SVS-Vistek, FLIR, IDS',
    formula: 'Hardware Trigger Latency < 1.0 ไมโครวินาที (µs)',
    tip: 'ความหน่วงในการตอบสนองของการยิงแฟลชผ่านขั้ว Hirose เร็วกว่าการสั่งผ่านคำสั่งซอฟต์แวร์ USB/LAN ถึง 1,000 เท่า'
  },

  // =========================================================================
  // 3. Deep Learning & Edge AI (ปัญญาประดิษฐ์และเอดจ์คอมพิวติ้ง)
  // =========================================================================
  {
    category: 'ai',
    categoryName: 'ปัญญาประดิษฐ์และการประมวลผลเอดจ์ (Deep Learning & Edge AI)',
    term: 'NPU',
    fullEnglish: 'Neural Processing Unit',
    thaiName: 'หน่วยประมวลผลโครงข่ายประสาทเทียม',
    unit: 'TOPS (Tera Operations Per Second)',
    meaning: 'ไมโครชิปสถาปัตยกรรมเฉพาะทางที่ออกแบบมาเพื่อคำนวณคณิตศาสตร์เมทริกซ์คูณและบวกสะสม (MAC - Multiply-Accumulate) ของโครงข่ายสมองกลเทียมโดยเฉพาะ',
    origin: 'พัฒนาขึ้นมาเพื่อประหยัดพลังงานเมื่อเทียบกับ GPU ขนาดใหญ่ เช่น Hailo-8 M.2 NPU, Google Coral Edge TPU, Intel NPU',
    formula: 'ประสิทธิภาพพลังงาน: 3 TOPS ต่อ 1 วัตต์ (กินไฟเพียง 2.5 - 5 วัตต์)',
    tip: 'NPU สามารถติดตั้งเพิ่มลงในสล็อต M.2 บนเมนบอร์ด Industrial PC เดิมในโรงงานได้ทันทีโดยไม่ต้องเปลี่ยนตู้ควบคุม'
  },
  {
    category: 'ai',
    categoryName: 'ปัญญาประดิษฐ์และการประมวลผลเอดจ์ (Deep Learning & Edge AI)',
    term: 'TOPS',
    fullEnglish: 'Tera Operations Per Second',
    thaiName: 'ล้านล้านคำสั่งต่อวินาที',
    unit: 'TOPS (10¹² Operations/s)',
    meaning: 'หน่วยวัดพลังการประมวลผลของชิป AI: 1 TOPS หมายถึงชิปสามารถคำนวณคณิตศาสตร์จุดทศนิยมหรือจำนวนเต็มได้ 1,000,000,000,000 คำสั่งใน 1 วินาที',
    origin: 'เกณฑ์มาตรฐานในอุตสาหกรรมเซมิคอนดักเตอร์สำหรับวัดประสิทธิภาพ AI Hardware',
    formula: 'ตัวอย่าง: Hailo-8 = 26 TOPS, Jetson Orin Nano = 40 TOPS, Jetson AGX Orin = 275 TOPS',
    tip: 'ในการตรวจจับชิ้นงานสายพานความเร็ว 60 - 120 ชิ้น/นาที ชิป AI ขนาด 20 - 40 TOPS เพียงพอสำหรับการรันโมเดล YOLO OBB ได้ที่ความเร็ว >100 FPS'
  },
  {
    category: 'ai',
    categoryName: 'ปัญญาประดิษฐ์และการประมวลผลเอดจ์ (Deep Learning & Edge AI)',
    term: 'INT8 Quantization',
    fullEnglish: '8-bit Signed Integer Model Quantization',
    thaiName: 'การบีบอัดค่าน้ำหนักโมเดลเป็นจำนวนเต็ม 8 บิต',
    unit: 'บิต (Bits: 32-bit Float -> 8-bit Int)',
    meaning: 'กระบวนการแปลงค่าน้ำหนักทศนิยม 32 บิต (FP32) ในโครงข่ายประสาทเทียม ให้กลายเป็นตัวเลขจำนวนเต็ม 8 บิตแบบมีเครื่องหมาย (Two\'s Complement: -128 ถึง +127)',
    origin: 'เกิดจากสถาปัตยกรรม 8 บิต (2⁸ = 256 ระดับ, บิตที่ 7 เป็นบิตเครื่องหมาย Sign bit, บิต 0-6 บ่งชี้ขนาด -128 ถึง 127)',
    formula: 'q = clip(round(x / S), -128, 127) โดย S = max(|x|) / 127, ถอดรหัสกลับ: x̂ = q × S',
    tip: 'การบีบอัดเป็น INT8 ทำให้ขนาดไฟล์โมเดลเล็กลง 4 เท่า (เช่น จาก 80 MB เหลือ 20 MB) และทำให้ชิป AI รันเร็วขึ้น 2 - 4 เท่า โดยสูญเสียความแม่นยำต่ำกว่า 0.3% mAP'
  },
  {
    category: 'ai',
    categoryName: 'ปัญญาประดิษฐ์และการประมวลผลเอดจ์ (Deep Learning & Edge AI)',
    term: 'KL Divergence',
    fullEnglish: 'Kullback-Leibler Divergence (Relative Entropy)',
    thaiName: 'การวัดความสูญเสียข้อมูลทางสถิติของค่าน้ำหนัก',
    unit: 'ค่าความแตกต่างทางเอนโทรปี (D_KL ≥ 0)',
    meaning: 'ฟังก์ชันทางสถิติที่ TensorRT นำมาใช้ในขั้นตอน INT8 Calibration เพื่อค้นหาขอบเขตการตัดค่าส่วนหาง (Threshold T) ที่ทำให้การกระจายตัวของ INT8 สูญเสียข้อมูลน้อยที่สุดเทียบกับ FP32 เดิม',
    origin: 'ทฤษฎีสารสนเทศของ Solomon Kullback และ Richard Leibler',
    formula: 'D_KL(P || Q) = ∑ P(i) × log(P(i) / Q(i)) โดยหาค่า T ที่ให้ D_KL ต่ำสุด',
    tip: 'การใช้ KL Divergence ป้องกันไม่ให้ค่าน้ำหนักที่กระโดดผิดปกติ (Outliers) บีบอัดค่าน้ำหนักส่วนใหญ่ให้แบนแต๊ดแต๋ รักษาความแม่นยำของโมเดลไว้ได้เกือบ 100%'
  },
  {
    category: 'ai',
    categoryName: 'ปัญญาประดิษฐ์และการประมวลผลเอดจ์ (Deep Learning & Edge AI)',
    term: 'PTQ vs QAT',
    fullEnglish: 'Post-Training Quantization vs Quantization-Aware Training',
    thaiName: 'การแปลงสเกลหลังเทรนเทียบกับการเทรนจำลองควอนไทเซชัน',
    unit: 'กระบวนการปรับแต่งโมเดล (Optimization Pipeline)',
    meaning: 'PTQ: นำโมเดล FP32 ที่เทรนเสร็จแล้วมารัน Calibration กับรูปตัวอย่าง 100-500 รูปใน 2 นาที / QAT: จำลองการปัดเศษ 8 บิตในระหว่างเทรนโมเดลตั้งแต่ต้น',
    origin: 'ระเบียบวิธีวิศวกรรมการบีบอัดโมเดลเพื่อลงชิปเอดจ์',
    formula: 'เกณฑ์เลือกใช้: ลองทำ PTQ ก่อนเสมอ หากความแม่นยำตกเกิน 1% ค่อยใช้ QAT',
    tip: 'ในงานตรวจจับชิ้นงานอุตสาหกรรม 95% ของโมเดล YOLO OBB และ PatchCore สามารถใช้ PTQ ผ่านฉลุยโดยไม่ต้องเสียเวลาเทรน QAT ใหม่'
  },
  {
    category: 'ai',
    categoryName: 'ปัญญาประดิษฐ์และการประมวลผลเอดจ์ (Deep Learning & Edge AI)',
    term: 'TensorRT',
    fullEnglish: 'NVIDIA TensorRT High-Performance Inference Engine',
    thaiName: 'รันไทม์คอมไพเลอร์ AI ความเร็วสูงพิเศษของ NVIDIA',
    unit: 'Engine ไบนารี (.engine)',
    meaning: 'ซอฟต์แวร์คอมไพเลอร์ที่ทำการวิเคราะห์โครงข่ายประสาทเทียม รวมเลเยอร์คำสั่ง (Kernel Fusion), ตัดหน่วยความจำซ้ำซ้อน, และจัดสรรรีจิสเตอร์ของ GPU เพื่อให้ได้ความเร็วสูงสุด',
    origin: 'พัฒนาโดย NVIDIA เฉพาะสำหรับสถาปัตยกรรม GPU/NPU เพื่อใช้งานในระบบอัตโนมัติและหุ่นยนต์',
    formula: 'ลดความหน่วง (Latency) ลงได้ 3 - 10 เท่า เมื่อเทียบกับไพธอนรันไทม์ (PyTorch Runtime)',
    tip: 'ไฟล์โมเดลที่คอมไพล์เป็น .engine จะล็อกติดกับรุ่นของ GPU นั้นๆ เช่น คอมไพล์บน Jetson Orin Nano จะไม่สามารถก๊อปปี้ไปรันบนการ์ดจอ RTX 4090 ได้ ต้องคอมไพล์ใหม่บนเครื่องเป้าหมายเสมอ'
  },
  {
    category: 'ai',
    categoryName: 'ปัญญาประดิษฐ์และการประมวลผลเอดจ์ (Deep Learning & Edge AI)',
    term: 'OBB',
    fullEnglish: 'Oriented Bounding Box',
    thaiName: 'กรอบสี่เหลี่ยมระบุพิกัดที่หมุนเอียงตามมุมวัตถุ',
    unit: 'พารามิเตอร์ 5 ตัว (x_c, y_c, w, h, θ) หรือ จุดพิกัด 8 จุด',
    meaning: 'การตีกรอบล้อมรอบชิ้นงานโดยกรอบจะหมุนเอียงแนบชิดตามองศาจริงของชิ้นงาน (θ) ต่างจากกรอบเดิม AABB ที่เป็นสี่เหลี่ยมแนวดิ่ง',
    origin: 'พัฒนาขึ้นมาเพื่อแก้ปัญหาชิ้นงานที่วางเอียงหรือวางไขว้กันบนสายพาน และส่งพิกัดองศาให้แขนกลหมุนมือจับ',
    formula: '[x_i, y_i]^T = [x_c, y_c]^T + R(θ) × [±w/2, ±h/2]^T โดย R(θ) คือ Rotation Matrix',
    tip: 'YOLOv8-OBB / YOLOv11-OBB ส่งค่ามุม Theta ตรงเข้า Robot Tool Flange ทำให้แขนกลหมุนข้อมือมารอที่มุมนั้นทันทีก่อนลงแตะชิ้นงาน ลดเวลาหยิบลงได้ 0.8 วินาทีต่อชิ้น'
  },
  {
    category: 'ai',
    categoryName: 'ปัญญาประดิษฐ์และการประมวลผลเอดจ์ (Deep Learning & Edge AI)',
    term: 'GWD',
    fullEnglish: 'Gaussian Wasserstein Distance Loss',
    thaiName: 'ฟังก์ชันสูญเสียระยะทางเกาส์เซียนสำหรับกรอบหมุนเอียง',
    unit: 'ฟังก์ชันคณิตศาสตร์สถิติ (Loss Metric)',
    meaning: 'สมการ Loss ที่แปลงกรอบสี่เหลี่ยมหมุนเอียง OBB ให้กลายเป็นการแจกแจงแบบปกติ 2 มิติ (2D Gaussian Distribution) เพื่อวัดความคล้ายคลึงระหว่างกล่องพยากรณ์กับกล่องเฉลยจริง',
    origin: 'คิดค้นขึ้นเพื่อแก้ปัญหาการกระโดดของมุมที่ขอบรอยต่อ (Angle Boundary Periodicity: เช่น มุมกระโดดจาก +90° เป็น -90°)',
    formula: 'd²(N_p, N_g) = ||μ_p - μ_g||² + Tr(Σ_p + Σ_g - 2(Σ_p^(1/2) Σ_g Σ_p^(1/2))^(1/2))',
    tip: 'หากไม่ใช้ GWD โมเดล OBB จะเทรนไม่นิ่งและสับสนทิศทางเมื่อชิ้นงานหมุนครบรอบ 90 หรือ 180 องศา'
  },
  {
    category: 'ai',
    categoryName: 'ปัญญาประดิษฐ์และการประมวลผลเอดจ์ (Deep Learning & Edge AI)',
    term: 'IoU',
    fullEnglish: 'Intersection over Union',
    thaiName: 'อัตราส่วนพื้นที่ทับซ้อนต่อพื้นที่รวม',
    unit: 'อัตราส่วนทศนิยม (0.00 ถึง 1.00 หรือ 0% ถึง 100%)',
    meaning: 'ตัววัดความแม่นยำเชิงพื้นที่ของกรอบตรวจจับ: นำพื้นที่ที่กล่องพยากรณ์ทับซ้อนกับกล่องเฉลย (Intersection) หารด้วยพื้นที่รวมทั้งหมดของทั้งสองกล่อง (Union)',
    origin: 'ดัชนี Jaccard Index ในทางคณิตศาสตร์เซต',
    formula: 'IoU = Area(Box_Pred ∩ Box_GT) / Area(Box_Pred ∪ Box_GT)',
    tip: 'ในขั้นตอน Non-Maximum Suppression (NMS) หากสองกล่องมีค่า IoU > 0.5 ระบบจะถือว่าเป็นวัตถุตัวเดียวกัน และคัดเฉพาะกล่องที่มีค่า Confidence สูงสุดไว้'
  },
  {
    category: 'ai',
    categoryName: 'ปัญญาประดิษฐ์และการประมวลผลเอดจ์ (Deep Learning & Edge AI)',
    term: 'NMS',
    fullEnglish: 'Non-Maximum Suppression',
    thaiName: 'การตัดกรอบการตรวจจับซ้ำซ้อนให้เหลือกรอบที่แม่นที่สุด',
    unit: 'กระบวนการขั้นตอนวิธี (Post-Processing Filter)',
    meaning: 'อัลกอริทึมที่ทำการคัดกรองกล่อง Bounding Box ที่โมเดล AI พ่นออกมานับร้อยกล่องสำหรับวัตถุชิ้นเดียวกัน ให้เหลือเพียงกล่องที่ดีที่สุดเพียงกล่องเดียว',
    origin: 'ขั้นตอนมาตรฐานของการตรวจจับวัตถุ (Object Detection) ตั้งแต่ยุค Haar Cascades จนถึง YOLO',
    formula: 'คัดกล่องที่มี Confidence สูงสุด แล้วลบกล่องข้างเคียงที่มี IoU เกิน Threshold ทิ้ง',
    tip: 'สำหรับกรอบ OBB ต้องใช้ Rotated NMS (คำนวณพื้นที่ทับซ้อนของรูปหลายเหลี่ยมหมุน) จึงจะสามารถแยกแยะชิ้นงานที่วางชิดติดกันได้โดยไม่เผลอลบชิ้นข้างเคียงทิ้ง'
  },
  {
    category: 'ai',
    categoryName: 'ปัญญาประดิษฐ์และการประมวลผลเอดจ์ (Deep Learning & Edge AI)',
    term: 'PatchCore',
    fullEnglish: 'Patch-Level Memory Bank Anomaly Detection Architecture',
    thaiName: 'อัลกอริทึมตรวจจับความผิดปกติระดับแพทช์โดยไม่ใช้ภาพของเสีย',
    unit: 'มิติเวกเตอร์ 1024-D / Anomaly Score (0.00 - 1.00)',
    meaning: 'สถาปัตยกรรม AI ตรวจจับรอยตำหนิและของเสียโดยเรียนรู้เฉพาะลักษณะชิ้นงานดี (OK Samples) สกัดเวกเตอร์ลักษณะเด่นระดับย่อยและบีบอัดด้วย Coreset Subsampling',
    origin: 'พัฒนาโดยนักวิจัยระดับโลกและนำมาเป็นอัลกอริทึมแกนหลักในไลบรารี Anomalib ของ Intel OpenVINO',
    formula: 's(x_i) = min_{m ∈ M_C} || φ(x_i) - m ||₂ (วัดระยะห่างแบบยุคลิด L2 เทียบกับคลังของดี)',
    tip: 'ข้อได้เปรียบปฏิวัติวงการ: ใช้ภาพชิ้นงานดีเพียง 30 - 80 ภาพ เทรนเสร็จใน 3 นาที สามารถตรวจจับของเสียที่ไม่เคยพบเห็นมาก่อน (Unseen Defects) ได้ 100% ทันที'
  },
  {
    category: 'ai',
    categoryName: 'ปัญญาประดิษฐ์และการประมวลผลเอดจ์ (Deep Learning & Edge AI)',
    term: 'ViT',
    fullEnglish: 'Vision Transformer',
    thaiName: 'สถาปัตยกรรมทรานส์ฟอร์เมอร์สำหรับการประมวลผลภาพ',
    unit: 'จำนวนพารามิเตอร์ (เช่น ViT-B/16, ViT-L/14) / ขนาดแพทช์ 16x16 พิกเซล',
    meaning: 'การนำโมเดลสถาปัตยกรรม Attention ที่ใช้ในภาษา (LLM) มาใช้กับภาพ โดยตัดภาพออกเป็นตารางแพทช์ย่อยๆ ขนาด 16×16 พิกเซล แล้วให้แต่ละแพทช์คุยกันเพื่อเข้าใจภาพรวมระดับโครงสร้าง',
    origin: 'งานวิจัยกูเกิลปี 2020 "An Image is Worth 16x16 Words"',
    formula: 'Attention(Q, K, V) = softmax((Q K^T) / √d_k) × V',
    tip: 'โมเดล ViT เก่งกาจมากในการตรวจจับความผิดปกติเชิงบริบท (Structural Context) เช่น อุปกรณ์วางสลับตำแหน่ง หรือลายพิมพ์ขาดตอน'
  },
  {
    category: 'ai',
    categoryName: 'ปัญญาประดิษฐ์และการประมวลผลเอดจ์ (Deep Learning & Edge AI)',
    term: 'SAM 2',
    fullEnglish: 'Segment Anything Model 2 (Meta AI)',
    thaiName: 'แบบจำลองการตัดแยกวัตถุแบบครอบจักรวาลเวอร์ชัน 2',
    unit: 'โมเดล Zero-Shot Foundation Model',
    meaning: 'โมเดล AI ขนาดใหญ่ที่สามารถสร้าง Mask ตัดแยกชิ้นส่วนวัตถุใดๆ ในภาพหรือวิดีโอได้อย่างสมบูรณ์แบบเพียงแค่คลิกจุดบอก (Point Prompt) หรือตีกรอบ (Box Prompt)',
    origin: 'พัฒนาโดย Meta AI Research สำหรับงาน Computer Vision ยุคใหม่',
    formula: 'Zero-Shot Masking (ไม่ต้องเทรนข้อมูลล่วงหน้า)',
    tip: 'ใช้ในการทำ Automated Data Labeling หรือช่วยทำความสะอาดมาสก์พื้นหลังในขั้นตอนเตรียมข้อมูลภาพก่อนป้อนเข้าเทรนโมเดลโรงงาน'
  },

  // =========================================================================
  // 4. Factory Automation & Integration (ระบบอัตโนมัติและการเชื่อมโยงโรงงาน)
  // =========================================================================
  {
    category: 'automation',
    categoryName: 'ระบบอัตโนมัติและการเชื่อมโยงโรงงาน (Automation & Integration)',
    term: 'Pipeline Latency',
    fullEnglish: 'End-to-End Machine Vision Pipeline Latency Budget',
    thaiName: 'งบประมาณเวลารวมของไปป์ไลน์การตรวจสอบ',
    unit: 'มิลลิวินาที (ms)',
    meaning: 'เวลารวมตั้งแต่ชิ้นงานแล่นผ่านหน้าเซนเซอร์ตรวจจับ จนถึงจังหวะที่คำสั่งส่งถึงโซลินอยด์วาล์วเตะของเสีย',
    origin: 'ผลรวมของ 7 ขั้นตอนฮาร์ดแวร์และซอฟต์แวร์: T_trig + T_exp + T_readout + T_pre + T_infer + T_post + T_fieldbus',
    formula: 'T_total ≤ T_max โดย T_max = D_reject / V_conveyor (ระยะทางถึงหัวเตะ mm / ความเร็วสายพาน mm/s)',
    tip: 'ต้องมีค่า Safety Margin อย่างน้อย 50% เสมอ เช่น หาก T_max = 200 ms เวลารวมของไปป์ไลน์ไม่ควรเกิน 50-70 ms'
  },
  {
    category: 'automation',
    categoryName: 'ระบบอัตโนมัติและการเชื่อมโยงโรงงาน (Automation & Integration)',
    term: 'PROFINET IRT',
    fullEnglish: 'Isochronous Real-Time Industrial Ethernet',
    thaiName: 'โปรโตคอลอีเทอร์เน็ตอุตสาหกรรมแบบเวลาจริงคงที่ระดับไมโครวินาที',
    unit: 'ไมโครวินาที (Cycle Time < 250 µs, Jitter < 1 µs)',
    meaning: 'การสื่อสารเครือข่ายอุตสาหกรรมความเร็วสูงระหว่าง IPC แมชชีนวิชันกับ PLC เครื่องจักร ที่รับประกันเวลาการส่งข้อมูลแม่นยำแน่นอน',
    origin: 'มาตรฐานสากล IEC 61158 / IEC 61784 นิยมใช้ใน PLC Siemens และระบบอัตโนมัติยานยนต์',
    formula: 'สัญญาณส่งคำสั่งเตะของเสีย (Bit Dispatch) ส่งถึงโซลินอยด์วาล์วภายใน 0.25 ms',
    tip: 'การใช้ PROFINET IRT ป้องกันปัญหาการดีเลย์ของเน็ตเวิร์ก ทำให้หัวเตะลมยิงลมโดนชิ้นงานเป้าหมายอย่างแม่นยำ ไม่ดีเลย์จนโดนชิ้นงานดีตัวถัดไป'
  },
  {
    category: 'automation',
    categoryName: 'ระบบอัตโนมัติและการเชื่อมโยงโรงงาน (Automation & Integration)',
    term: 'Quadrature 4x',
    fullEnglish: 'Quadrature 4x Pulse Decoding',
    thaiName: 'การถอดรหัสสัญญาณเอ็นโค้เดอร์แบบทวีคูณ 4 เท่า',
    unit: 'พัลส์ (Pulses = PPR × 4)',
    meaning: 'การนับสัญญาณจาก Rotary Encoder สองเฟส (Phase A และ Phase B ที่เยื้องมุมกัน 90 องศา) โดยนับทั้งขอบขาขึ้น (Rising Edge) และขาลง (Falling Edge) ของทั้งสองเฟส',
    origin: 'หลักการวงจรอิเล็กทรอนิกส์ดิจิทัลแบบ Quadrature Decoder ในการ์ด High-Speed Counter ของ PLC',
    formula: 'จำนวนพัลส์จริงต่อรอบ = PPR × 4 (เหตุผลที่มี × 4 คือ Phase A มี 2 ขอบ + Phase B มี 2 ขอบ รวมเป็น 4 ขอบต่อ 1 คาบคลื่น)',
    tip: 'เช่น เอ็นโค้เดอร์ 1,000 PPR เมื่อต่อเข้าการ์ด PLC แบบ 4x จะนับได้ถึง 4,000 พัลส์ต่อการหมุน 1 รอบ ทำให้ติดตามตำแหน่งสายพานได้ละเอียดระดับ 0.05 มม.'
  },
  {
    category: 'automation',
    categoryName: 'ระบบอัตโนมัติและการเชื่อมโยงโรงงาน (Automation & Integration)',
    term: 'PPM (Encoder Motion)',
    fullEnglish: 'Pulses Per Millimeter',
    thaiName: 'จำนวนพัลส์ของเอ็นโค้เดอร์ต่อระยะทาง 1 มิลลิเมตร',
    unit: 'พัลส์ต่อมิลลิเมตร (pulses/mm)',
    meaning: 'ความละเอียดในการติดตามตำแหน่งทางกลของสายพานลำเลียง: บอกว่าเมื่อสายพานเคลื่อนที่ไป 1 มม. เอ็นโค้เดอร์จะสร้างสัญญาณกี่พัลส์',
    origin: 'คำนวณจากจำนวนพัลส์ต่อรอบของเอ็นโค้เดอร์ (PPR × 4) หารด้วยเส้นรอบวงของลูกกลิ้งสายพาน (π × Diameter)',
    formula: 'PPM = (Encoder_PPR × 4) / (π × Wheel_Diameter_mm)',
    tip: 'อย่าสับสนกับ PPM ในงาน QA! ในระบบสายพาน PPM ย่อมาจาก Pulses Per Millimeter ใช้ป้อนเข้า PLC High-Speed Counter เสมอ'
  },
  {
    category: 'automation',
    categoryName: 'ระบบอัตโนมัติและการเชื่อมโยงโรงงาน (Automation & Integration)',
    term: 'PPM (Quality Escape)',
    fullEnglish: 'Parts Per Million (Defect Escape Rate)',
    thaiName: 'อัตราของเสียหลุดรอดต่อหนึ่งล้านชิ้น',
    unit: 'PPM (Parts Per Million)',
    meaning: 'ดัชนีชี้วัดความแม่นยำของการคัดแยกคุณภาพในอุตสาหกรรมยานยนต์ (IATF 16949)',
    origin: 'อัตราส่วนจำนวนชิ้นงาน NG ที่หลุดรอดไปถึงลูกค้า ต่อจำนวนชิ้นงานที่ผลิตทั้งหมดหนึ่งล้านชิ้น',
    formula: 'PPM = (จำนวนชิ้นงาน NG ที่หลุดรอด / จำนวนผลิตทั้งหมด) × 1,000,000',
    tip: 'เป้าหมายมาตรฐานอุตสาหกรรมยานยนต์คือ 0 PPM (Zero Defect) นั่นคือต้องไม่มีชิ้นงานเสียหลุดรอดแม้แต่ชิ้นเดียว'
  },
  {
    category: 'automation',
    categoryName: 'ระบบอัตโนมัติและการเชื่อมโยงโรงงาน (Automation & Integration)',
    term: 'Jidoka (自働化)',
    fullEnglish: 'Autonomation / Intelligent Automation',
    thaiName: 'ระบบอัตโนมัติที่หยุดตัวเองทันทีเมื่อพบความผิดปกติ',
    unit: 'หลักการทางปรัชญาการผลิต (Lean / TPS)',
    meaning: 'การมอบสติปัญญาให้เครื่องจักรและระบบวิชันสามารถหยุดไลน์การผลิตได้เองโดยอัตโนมัติ (Automatic Line Stop) เมื่อตรวจพบของเสียต่อเนื่อง',
    origin: 'คิดค้นโดย Sakichi Toyoda ผู้ก่อตั้งกลุ่มบริษัทโตโยต้า',
    formula: 'Interlock Rule: หากพบของเสียชนิดเดียวกัน 3 ชิ้นติดต่อกัน สั่งตัดวงจร Run สัญญาณเครื่องจักรทันที',
    tip: 'การนำ Jidoka มาผสานกับแมชชีนวิชัน ช่วยป้องกันไม่ให้เครื่องจักรผลิตของเสียซ้ำซากนับพันชิ้นเมื่อแม่พิมพ์หรือคมมีดกลึงแตกหัก'
  }
];

/**
 * Interactive Industrial Engineering Glossary & Acronyms Modal Component
 */
export default function IndustrialGlossaryModal({ isOpen, onClose }) {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'ทั้งหมด (All Terms)' },
    { id: 'optics', name: 'ทัศนศาสตร์ & เรขาคณิต' },
    { id: 'hardware', name: 'กล้อง & ฮาร์ดแวร์' },
    { id: 'ai', name: 'AI & Edge NPU' },
    { id: 'automation', name: 'ระบบอัตโนมัติ & โรงงาน' }
  ];

  const filteredData = useMemo(() => {
    return INDUSTRIAL_GLOSSARY_DATA.filter(item => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchQuery = !searchQuery || 
        item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.fullEnglish.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.thaiName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.meaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.formula && item.formula.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md transition-all animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl w-full max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <FiBookOpen className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                คลังคำย่อ สูตรคำนวณ และที่มาของตัวเลขทางวิศวกรรม
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  {filteredData.length} รายการ
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Machine Vision &amp; Industrial Edge Computing Engineering Glossary
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 space-y-3">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตัวย่อ ชื่อเต็ม สูตรคำนวณ หรือคำอธิบาย (เช่น WD, FOV, NPU, INT8, Quadrature, PPM)..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                เคลียร์
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-xs'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Glossary Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 divide-y divide-slate-800/80">
          {filteredData.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-mono">
              ไม่พบคำค้นหา "{searchQuery}" ในคลังอภิธานศัพท์
            </div>
          ) : (
            filteredData.map((item, idx) => (
              <div key={idx} className="pt-4 first:pt-0 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-black text-cyan-400 font-mono tracking-tight bg-cyan-950/60 px-2.5 py-0.5 rounded-lg border border-cyan-500/30">
                      {item.term}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-white block">{item.thaiName}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{item.fullEnglish}</span>
                    </div>
                  </div>
                  {item.unit && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      หน่วย: {item.unit}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pl-1">
                  {item.meaning}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pl-1">
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                    <strong className="text-amber-400 block font-mono text-[10px] uppercase">📌 ที่มาของตัวเลข / ตัวแปร:</strong>
                    <div className="text-slate-300 leading-relaxed">{item.origin}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                    <strong className="text-emerald-400 block font-mono text-[10px] uppercase">📐 สูตรคำนวณที่เกี่ยวข้อง:</strong>
                    <div className="text-emerald-300/90 font-mono leading-relaxed">{item.formula}</div>
                  </div>
                </div>

                {item.tip && (
                  <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-200/90 flex items-start gap-2">
                    <FiInfo className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-cyan-300">ข้อควรจำหน้างานจริง:</strong> {item.tip}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Bottom Status Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>MES Learning Hub Technical Reference Standard</span>
          <span>กด Esc เพื่อปิด</span>
        </div>
      </div>
    </div>
  );
}
