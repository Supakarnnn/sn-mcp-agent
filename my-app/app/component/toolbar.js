import Link from "next/link";
import styles from "../page.module.css";

export default function Toolbar({
  showQuestionOptions,
  setShowQuestionOptions,
  setInput,
  apiMode,
  setApiMode,
  setMessages,
}) {
  const handleSelectChange = (e) => {
    setInput(e.target.value);
    setShowQuestionOptions(false);
  };

  const toggleApiMode = (mode) => {
    setApiMode(apiMode === mode ? "chat" : mode);
  };

  return (
    <div className={styles.toolBar}>
      {/* ปุ่มอัปโหลดฐานข้อมูล */}
      <Link href="/csv">
        <button className={styles.pillButton} aria-label="Update database">
          <span className={styles.icon}>📤</span> อัพเดทฐานข้อมูล
        </button>
      </Link>

      {/* ปุ่มเปิด/ปิดตัวเลือกคำถาม */}
      <button
        className={styles.pillButton}
        onClick={() => setShowQuestionOptions(!showQuestionOptions)}
      >
        คำถามตัวอย่าง
      </button>

      {/* Dropdown คำถามตัวอย่าง */}
      {showQuestionOptions && (
        <select
          className={styles.dropdown}
          onChange={handleSelectChange}
          defaultValue=""
        >
          <option value="" disabled>เลือกคำถาม</option>
          <option value="ใครมาสายสุดในวันนี้">ใครมาสายสุดในวันนี้</option>
          <option value="ขอรายงาน การเข้างาน แผนก XXXX ปี XXXX">
            ขอรายงาน การเข้างาน แผนก XXXX ปี XXXX
          </option>
          <option value="ขอรายงานการเข้างาน แผนก XXXX เดือน XXXX ปี XXXX">
            ขอรายงานการเข้างาน แผนก XXXX เดือน XXXX ปี XXXX
          </option>
          <option value="ขอรายงาน การเข้างาน แผนก back office ปี 2023">
            ขอรายงาน การเข้างาน แผนก back office ปี 2023
          </option>
        </select>
      )}

      {/* Checkbox สำหรับโหมด API */}
      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={apiMode === "report"}
          onChange={() => toggleApiMode("report")}
        />
        สร้างรายงานการเข้างาน
      </label>

      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={apiMode === "sickReport"}
          onChange={() => toggleApiMode("sickReport")}
        />
        สร้างรายงานการลางาน
      </label>

      {/* ปุ่มลบข้อความ */}
      <button className={styles.resetButton} onClick={() => setMessages([])}>
        🗑️ ลบข้อความทั้งหมด
      </button>
    </div>
  );
}