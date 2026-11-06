# 🤖 Robotics & Next-Gen AI Vision (2026 Edition) Architecture & Curriculum

## 1. Overview
เอกสารอ้างอิงสถาปัตยกรรม สูตรคำนวณ และโครงสร้างข้อมูลของหลักสูตร **หุ่นยนต์อุตสาหกรรม (Robotics Automation)** และ **Next-Gen AI Machine Vision 2.0 (2026 Edition)** ในระบบ MES Learning Hub

---

## 2. Robotics Automation (Enriched Modules 9 - 12)
หลักสูตร `c-robot-automation` ได้รับการเสริมเนื้อหาเทคโนโลยีสมัยใหม่ 4 โมดูล พร้อม Interactive Lab Simulators:

### Module 9: Collaborative Robots (Cobots) & Direct Teaching (ISO/TS 15066)
- **Component**: `RobotMod9` / `RobotCobotDirectTeachingSimulator`
- **ทฤษฎี & กฎหมายความปลอดภัย**:
  - มาตรฐาน ISO 10218-1/2 และ ISO/TS 15066
  - 4 วิธีการทำงานร่วมกัน:
    1. Safety-Rated Monitored Stop (SMS)
    2. Hand Guiding (Direct Teaching / Zero-Gravity Lead-Through)
    3. Speed and Separation Monitoring (SSM)
    4. Power and Force Limiting (PFL)
  - **สูตรคำนวณระยะหยุดปลอดภัย (Safety Distance)**:
    $$S = (v_h \times T_r) + (v_r \times T_r) + B + C$$
    *(โดย $v_h$ = ความเร็วคนเดิน 1.6 m/s, $v_r$ = ความเร็วแขนกล, $T_r$ = Response Time, $B$ = Braking distance, $C$ = Intrusion distance)*
  - **เกณฑ์แรงกดทับร่างกาย (Biomechanical Limits)**: ขีดจำกัดแรงกดชั่วขณะ $\le 140\text{ N}$

### Module 10: Digital Twin & Offline Programming (OLP)
- **Component**: `RobotMod10` / `RobotOfflineSimulationLab`
- **เทคโนโลยี**: RoboDK, Siemens Process Simulate, KUKA Sim, ABB RobotStudio
- **การตรวจจับจุดวิกฤตทางกลศาสตร์ (Singularity Detection)**:
  - **Wrist Singularity**: แกน 4 และแกน 6 ขนานกัน ($\theta_5 \to 0^\circ$) ทำให้ความเร็วเชิงมุมลู่เข้า $\infty$
  - **Shoulder Singularity**: ข้อมืออยู่บนแกนหมุนของ Joint 1
  - **Elbow Singularity**: แขนยืดตรงสุดขอบเขตพื้นที่ทำงาน (Workspace Boundary)
- **การปรับปรุงวิถีการเคลื่อนที่ (Trajectory Optimization)**:
  - เปรียบเทียบ Point-to-Point (PTP Stop) กับ Continuous Path (Zone Blending / Fly-by) ช่วยลด Cycle Time ลง 25-30%

### Module 11: Industrial Fieldbus & MES Integration
- **Component**: `RobotMod11` / `RobotIndustrialFieldbusLab`
- **โปรโตคอล**:
  - **PROFINET IRT**: Isochronous Real-Time Cycle time $< 1\text{ ms}$, Jitter $< 1\ \mu\text{s}$, PROFIsafe
  - **EtherCAT**: Processing-on-the-fly, Cycle time $250\ \mu\text{s} - 1\text{ ms}$, FSoE
  - **OPC UA**: Robotics Companion Specification สำหรับส่งถ่ายข้อมูล OEE & Predictive Maintenance ตรงเข้า MES
- **Handshaking Sequence**:
  `MES_Job_Start (Bit 0.0)` $\to$ `Robot_Ack (Bit 1.0)` $\to$ `Cycle_Running (Bit 1.1)` $\to$ `Job_Complete (Bit 1.2)` $\to$ `Quality_Pass (Bit 1.3)`

### Module 12: 3D Vision Guidance & AI Bin-Picking 6-DoF
- **Component**: `RobotMod12` / `RobotAiVisionBinPickingSimulator`
- **เทคโนโลยี**: 3D Point Cloud, Structured Light, Time-of-Flight (ToF)
- **ขั้นตอนการทำงาน**:
  1. Point Cloud Acquisition $\to$ กวาดพิกัด 3 มิติ
  2. 6-DoF Pose Estimation $\to$ คำนวณพิกัด $(X, Y, Z, \text{Roll}, \text{Pitch}, \text{Yaw})$ เทียบกับ CAD
  3. Collision-Free Path Planning $\to$ วางแผนเส้นทางเข้ากระบะไม่ให้ชนขอบ Bin
  4. Active Compliance Insertion $\to$ ใช้ Force/Torque Sensor ข้อมือปรับมุมขณะวางชิ้นงาน

---

## 3. Next-Gen AI Machine Vision & Edge Intelligence (2026 Edition)
หลักสูตรใหม่ `c-machine-vision-v2` แยกอิสระเพื่อไม่ให้กระทบหลักสูตรกลางเดิม:

### Module 1: Next-Gen AI Vision System Architecture & Edge Computing
- สถาปัตยกรรม Edge NPU (Zero-Cloud Latency, On-Premises 100%)
- เปรียบเทียบความเร็ว IPC CPU vs. NVIDIA Jetson Orin Nano vs. Hailo-8 M.2 NPU

### Module 2: Smart Optics, High-Speed CMOS & 3D Photometric Stereo
- เซนเซอร์ Global Shutter CMOS ความเร็วสูง
- เลนส์ของเหลวปรับโฟกัสด้วยไฟฟ้า (Liquid Lens) ใน 5 มิลลิวินาที
- เทคนิค **Photometric Stereo 4-Way Lighting**:
  - ยิงแสง 4 ทิศทางใน $1\text{ ms}$ สกัด Normal Map และ Surface Gradient แยกแยะความลึกรอยขีดข่วนระดับไมครอนบนผิวโลหะสะท้อนแสง

### Module 3: Anchor-Free YOLOv8/v11 & Oriented Bounding Box (OBB)
- ขจัดปัญหา Anchor Boxes แบบเดิม
- พยากรณ์กรอบพิกัด 5 มิติ $(x, y, w, h, \theta)$
- ตรวจจับชิ้นงานที่วางเอียงอิสระบนสายพานและส่งต่อมุมหมุน $\theta$ ให้หุ่นยนต์หยิบจับได้ทันที

### Module 4: Unsupervised Defect Detection (PatchCore / FastFlow / Anomalib)
- ตรวจจับของเสียโดยใช้ภาพชิ้นงาน OK ปกติเพียง 50-100 รูป (ไม่ต้องมีรูป NG)
- Coreset Feature Memory Bank และ Nearest Neighbor Distance Scoring
- ป้องกันการหลุดรอดของตำหนิรูปแบบใหม่ที่ไม่เคยเกิดขึ้นมาก่อน

### Module 5: Vision Transformers (ViT) & Segment Anything (SAM 2)
- กลไก Self-Attention เข้าใจโครงสร้างเรขาคณิตโดยรวมของชิ้นงาน
- การนำ Meta SAM 2 มาใช้ทำ Real-Time Zero-Shot Segmentation

### Module 6: Edge AI Deployment & TensorRT INT8 Quantization
- ไปป์ไลน์: PyTorch $\to$ ONNX $\to$ TensorRT INT8 Calibration
- ลดขนาดโมเดลลง 75% และเพิ่ม Throughput ได้ถึง $200+\text{ FPS}$

### Module 7: High-Speed Reject, PROFINET IRT & MES Integration
- ระบบ Rotary Encoder Shift Register Tracking:
  $$\text{Reject\_Pulse} = \text{Capture\_Pulse} + \frac{\text{Distance}_{\text{camera}\to\text{reject}}}{\text{Encoder Resolution}}$$
- ยิงลมเตะชิ้นงานของเสียลงถังด้วยความแม่นยำระดับมิลลิเมตร แม้ความเร็วสายพานจะเปลี่ยนแปลง
- บันทึก Defect Pareto Chart และรูปถ่ายของเสียผูกกับ Work Order ใน MES
