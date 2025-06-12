export const getChartOptions = (key, isForPdf = false, chartData = null) => {
    const hasMultipleDatasets = chartData && chartData.datasets && chartData.datasets.length > 1;

    const baseOptions = {
      responsive: !isForPdf,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: hasMultipleDatasets,
          position: 'top',
          align: 'center',
          labels: {
            usePointStyle: true,
            pointStyle: 'rect',
            padding: 15,
            color: isForPdf ? "#333" : "#000000",
            font: {
              size: isForPdf ? 14 : 12,
              family: 'Arial, sans-serif',
              weight: 'bold'
            }
          }
        },
        title: {
          display: true,
          text: key === 'Late Attendance' ? 'รายงานการมาสาย' :
            key === 'Services Late Arrivals' ? 'รายงานการมาสาย' :
              key === 'Sick Leave' ? 'รายงานการลางาน' :
                key === 'Take Leave' ? 'รายงานการลางาน' :
                  key === 'Chart' ? 'On report' :
                    `รายงาน: ${key}`,
          color: isForPdf ? "#2c3e50" : "#000000",
          font: {
            size: isForPdf ? 20 : 16,
            weight: 'bold',
            family: 'Arial, sans-serif'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        tooltip: {
          enabled: !isForPdf,
          backgroundColor: 'rgba(44, 62, 80, 0.9)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#3498db',
          borderWidth: 2,
          cornerRadius: 8,
          displayColors: true,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            label: function (context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              if (label.includes('ครั้ง') || label.includes('จำนวน')) {
                return `${label}: ${value} ครั้ง`;
              } else if (label.includes('ชั่วโมง') || label.includes('เวลา')) {
                return `${label}: ${value} ชั่วโมง`;
              }
              return `${label}: ${value}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: isForPdf ? "#2c3e50" : "#000000",
            font: {
              size: isForPdf ? 12 : 11,
              family: 'Arial, sans-serif'
            },
            maxRotation: 45,
            minRotation: 0,
            padding: 8
          },
          grid: {
            color: isForPdf ? "rgba(44, 62, 80, 0.2)" : "rgba(255,255,255,0.1)",
            lineWidth: 1
          },
          title: {
            display: true,
            text: 'ชื่อพนักงาน',
            color: isForPdf ? "#2c3e50" : "#000000",
            font: {
              size: isForPdf ? 14 : 12,
              family: 'Arial, sans-serif',
              weight: 'bold'
            }
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: isForPdf ? "#2c3e50" : "#000000",
            font: {
              size: isForPdf ? 12 : 11,
              family: 'Arial, sans-serif'
            },
            padding: 8
          },
          grid: {
            color: isForPdf ? "rgba(44, 62, 80, 0.2)" : "rgba(255,255,255,0.1)",
            lineWidth: 1
          },
          title: {
            display: true,
            text: 'จำนวน (ครั้ง/ชั่วโมง)',
            color: isForPdf ? "#2c3e50" : "#000000",
            font: {
              size: isForPdf ? 14 : 12,
              family: 'Arial, sans-serif',
              weight: 'bold'
            }
          }
        },
      },
      layout: {
        padding: {
          top: isForPdf ? 30 : 20,
          bottom: isForPdf ? 30 : 20,
          left: isForPdf ? 20 : 10,
          right: isForPdf ? 20 : 10
        }
      }
    };

    return baseOptions;
  };