import { utils, write } from 'xlsx';
import { saveAs } from 'file-saver';

export const useExcelExport = () => {
    const exportToExcel = (data, fileName = 'report.xlsx') => {
        if (!data) {
            console.error('No data provided for Excel export');
            return;
        }

        try {
            // แปลงข้อมูลเป็นรูปแบบที่เหมาะสมสำหรับ Excel
            const processData = (content) => {
                try {
                    // ลบส่วนที่เป็น JSON ออก (ถ้ามี)
                    content = content.replace(/\{[\s\S]*?\}/g, "").trim();

                    // แยกบรรทัด
                    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

                    const data = [];
                    let headers = [];

                    lines.forEach(line => {
                        // ข้าม line ที่เป็น markdown syntax ที่ไม่ต้องการ
                        if (line.startsWith('#') || line === '---' || line.startsWith('|--')) {
                            return;
                        }

                        // ตรวจจับหัวตาราง
                        if (line.startsWith('|')) {
                            const cells = line.split('|')
                                .map(cell => cell.trim())
                                .filter(cell => cell);

                            if (!headers.length) {
                                headers = cells;
                                data.push(headers);
                            } else {
                                data.push(cells);
                            }
                        } else {
                            // เก็บข้อความที่ไม่ใช่ตารางเป็นส่วนๆ
                            if (line) {
                                data.push([line]);
                            }
                        }
                    });

                    return data;
                } catch (error) {
                    console.error('Error processing data:', error);
                    return [['Error processing data']];
                }
            };

            // แปลงข้อมูลให้อยู่ในรูปแบบที่เหมาะสม
            const excelData = processData(data);

            if (!excelData || excelData.length === 0) {
                throw new Error('No data to export');
            }

            // สร้าง workbook และ worksheet
            const wb = utils.book_new();
            const ws = utils.aoa_to_sheet(excelData);

            // ปรับแต่ง style
            const range = utils.decode_range(ws['!ref']);
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_address = utils.encode_cell({ r: R, c: C });
                    if (!ws[cell_address]) continue;

                    // ตั้งค่า style สำหรับ header (แถวแรก)
                    if (R === 0) {
                        ws[cell_address].s = {
                            font: { bold: true, color: { rgb: "FFFFFF" } },
                            fill: { fgColor: { rgb: "4F90F7" } },
                            alignment: { horizontal: "left", vertical: "center" }
                        };
                    }
                    // ตั้งค่า style สำหรับเนื้อหา
                    else {
                        ws[cell_address].s = {
                            font: { color: { rgb: "000000" } },
                            alignment: { horizontal: "left", vertical: "center" },
                            fill: {
                                fgColor: { rgb: R % 2 ? "F8FAFC" : "FFFFFF" }
                            }
                        };
                    }
                }
            }

            // ปรับความกว้างคอลัมน์อัตโนมัติ
            const colWidths = excelData[0].map((_, i) => ({
                wch: Math.max(...excelData.map(row => {
                    const cell = row[i] || '';
                    return cell.toString().length;
                }))
            }));
            ws['!cols'] = colWidths;

            // เพิ่ม worksheet ลงใน workbook
            utils.book_append_sheet(wb, ws, "Report");

            // สร้างไฟล์ Excel
            const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            // บันทึกไฟล์
            saveAs(blob, fileName);

        } catch (error) {
            console.error('Error exporting to Excel:', error);
            throw error;
        }
    };

    return { exportToExcel };
}; 