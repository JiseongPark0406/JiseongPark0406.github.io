// 전역 변수
let coursesData = [];
let selectedCourses = [];
let filteredCourses = [];

// 색상 팔레트
const colors = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#FD79A8",
  "#FDCB6E",
  "#6C5CE7",
];

// 시간 매핑
const timeMap = {
  0: "08:00 ~ 08:50",
  1: "09:00 ~ 09:50",
  2: "10:00 ~ 10:50",
  3: "11:00 ~ 11:50",
  4: "12:00 ~ 12:50",
  5: "13:00 ~ 13:50",
  6: "14:00 ~ 14:50",
  7: "15:00 ~ 15:50",
  8: "16:00 ~ 16:50",
  9: "17:00 ~ 17:50",
  "0A-0": "07:30 ~ 08:45",
  "1-2A": "09:00 ~ 10:15",
  "2B-3": "10:30 ~ 11:45",
  "4-5A": "12:00 ~ 13:15",
  "5B-6": "13:30 ~ 14:45",
  "7-8A": "15:00 ~ 16:15",
  "8B-9": "16:30 ~ 17:45",
  야1: "18:00 ~ 18:50",
  야2: "18:55 ~ 19:45",
  야3: "19:50 ~ 20:40",
  야4: "20:45 ~ 21:35",
  야5: "21:40 ~ 22:30",
  "야1-2A": "18:00 ~ 19:15",
  "야2B-3": "19:25 ~ 20:40",
  "야4-5A": "20:50 ~ 22:05",
};

// 시간표 시간 슬롯 (9시부터 21시까지)
const timeSlots = [];
for (let hour = 9; hour <= 21; hour++) {
  timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
}

// 실제 CSV 데이터를 여기에 붙여넣으세요 (임시)
const embeddedCSVData = `section_id,전공,이수구분,교과목명,학점,교수명,요일,교시/시간,수업방법
test1,컴퓨터공학과,전필,자료구조,3.0,김교수,월,1-2A,오프라인
test1,컴퓨터공학과,전필,자료구조,3.0,김교수,수,1-2A,오프라인
test2,컴퓨터공학과,전선,웹프로그래밍,3.0,박교수,화,7-8A,블렌디드
test3,산업경영공학과,기교,선형대수,3.0,장교수,목,2B-3,오프라인
test3,산업경영공학과,기교,선형대수,3.0,장교수,목,4-5A,오프라인
test4,교양,교필,대학영어,2.0,Smith,금,4-5A,오프라인
test5,경영학부,전필,마케팅,3.0,최교수,화,2B-3,오프라인
test6,경영학부,전선,회계학,3.0,정교수,목,7-8A,오프라인
test7,수학과,전필,미적분학,3.0,한교수,월,야1-2A,오프라인
test8,물리학과,기교,일반물리학,3.0,윤교수,수,4-5A,오프라인`;

// 시간을 분으로 변환하는 함수
function timeToMinutes(timeString) {
  const [hour, minute] = timeString.split(":").map(Number);
  return hour * 60 + minute;
}

// 분을 시간 문자열로 변환하는 함수
function minutesToTime(minutes) {
  const hour = Math.floor(minutes / 60);
  const min = minutes % 60;
  return `${hour.toString().padStart(2, "0")}:${min
    .toString()
    .padStart(2, "0")}`;
}

// 시간을 그리드 위치로 변환 (5분 단위 정밀도)
function timeToGridPosition(timeString) {
  if (!timeString || timeString === "미정") return null;

  const [startTime] = timeString.split(" ~ ");
  const startMinutes = timeToMinutes(startTime);
  const gridStartMinutes = 9 * 60; // 9:00 AM을 0으로 기준
  const gridEndMinutes = 21 * 60; // 9:00 PM까지

  if (startMinutes < gridStartMinutes || startMinutes > gridEndMinutes)
    return null;

  // 5분 단위로 정밀한 위치 계산 (1시간 = 60분 = 12개의 5분 단위)
  return (startMinutes - gridStartMinutes) / 5;
}

// 시간 지속시간 계산 (5분 단위)
function getTimeDuration(timeString) {
  if (!timeString || timeString === "미정") return 12; // 기본 1시간 = 12개의 5분 단위

  const [startTime, endTime] = timeString.split(" ~ ");
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  const durationMinutes = endMinutes - startMinutes;

  // 5분 단위로 변환 (최소 1개 단위)
  return Math.max(1, Math.round(durationMinutes / 5));
}

// CSV 라인 파싱 함수 (따옴표 처리)
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// CSV 파싱 함수 (개선된 버전)
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    console.error("CSV 파일이 비어있거나 헤더만 있습니다.");
    return [];
  }

  const headers = parseCSVLine(lines[0]);
  console.log("CSV 헤더:", headers);

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;

    const values = parseCSVLine(lines[i]);
    const row = {};

    headers.forEach((header, index) => {
      row[header.trim()] = values[index]
        ? values[index].trim().replace(/^"|"$/g, "")
        : "";
    });

    // 시간 매핑 적용
    if (row["교시/시간"] && timeMap[row["교시/시간"]]) {
      row["시간"] = timeMap[row["교시/시간"]];
    } else if (row["교시/시간"] && row["교시/시간"].includes("~")) {
      row["시간"] = row["교시/시간"];
    } else {
      row["시간"] = "미정";
    }

    if (row.section_id && row.교과목명) {
      data.push(row);
    }
  }

  return data;
}

// CSV 파일 로드 함수 (CORS 대응 버전)
async function loadCSVData() {
  console.log("CSV 로드 시작...");

  // 로컬 환경 감지
  const isLocal =
    window.location.protocol === "file:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  // 서버 환경에서 CSV 파일 로드 시도
  const possiblePaths = [
    "./course_schedule_with_section_id.csv",
    "course_schedule_with_section_id.csv",
    "/course_schedule_with_section_id.csv",
  ];

  for (const path of possiblePaths) {
    try {
      console.log(`시도 중인 경로: ${path}`);
      const response = await fetch(path);

      if (!response.ok) {
        console.log(`${path} 실패: ${response.status}`);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        console.log("파일이 비어있습니다.");
        continue;
      }

      let decodedText;
      try {
        const decoder = new TextDecoder("cp949");
        decodedText = decoder.decode(arrayBuffer);
        console.log("cp949 디코딩 성공");
      } catch (error) {
        try {
          const decoder = new TextDecoder("euc-kr");
          decodedText = decoder.decode(arrayBuffer);
          console.log("EUC-KR 디코딩 성공");
        } catch (error2) {
          console.log("인코딩 디코딩 실패, 기본값 사용");
          decodedText = new TextDecoder().decode(arrayBuffer);
        }
      }

      coursesData = parseCSV(decodedText);
      if (coursesData.length === 0) {
        console.log("파싱된 데이터가 없습니다. 다음 경로 시도...");
        continue;
      }

      console.log("✅ CSV 로드 성공!", path);
      setupDataAndUI("서버에서 로드");
      return;
    } catch (error) {
      console.error(`${path} 에러:`, error);
      continue;
    }
  }

  // 모든 경로 실패한 경우 - 내장 데이터로 폴백
  console.warn("CSV 파일 로드 실패, 내장 데이터 사용");
  loadEmbeddedData();
}

// 내장 데이터 로드 함수
function loadEmbeddedData() {
  console.log("내장 데이터 사용");
  coursesData = parseCSV(embeddedCSVData);
  console.log("내장 데이터 파싱 완료:", coursesData.length, "개 항목");
  setupDataAndUI("내장 데이터");
}

// 데이터 설정 및 UI 초기화 공통 함수
function setupDataAndUI(source) {
  groupCoursesBySection();
  initializeFilters();
  renderSchedule();

  const isEmbedded = source.includes("내장") || source.includes("로컬");
  const color = isEmbedded ? "orange" : "green";
  const icon = isEmbedded ? "⚠️" : "✅";

  document.getElementById("courseList").innerHTML = `
    <div class="loading-message" style="color: ${color};">
      ${icon} ${coursesData.length}개 과목을 불러왔습니다!<br>
      <small>데이터 소스: ${source}</small>
      ${
        isEmbedded
          ? "<br><br><strong>참고:</strong> 로컬 테스트용 데이터입니다.<br>실제 배포시에는 CSV 파일이 사용됩니다."
          : ""
      }
    </div>
  `;

  setTimeout(() => {
    updateCourseList();
  }, 1500);
}

// 섹션별로 과목 그룹화
function groupCoursesBySection() {
  const sectionMap = new Map();

  coursesData.forEach((course) => {
    const sectionId = course.section_id;
    if (!sectionMap.has(sectionId)) {
      sectionMap.set(sectionId, {
        section_id: sectionId,
        전공: course.전공,
        이수구분: course.이수구분,
        교과목명: course.교과목명,
        학점: parseFloat(course.학점) || 0,
        교수명: course.교수명,
        수업방법: course.수업방법,
        times: [],
      });
    }

    if (course.요일 !== "미정" && course.시간 !== "미정") {
      sectionMap.get(sectionId).times.push({
        요일: course.요일,
        시간: course.시간,
        교시: course["교시/시간"],
      });
    }
  });

  coursesData = Array.from(sectionMap.values());

  coursesData.forEach((course) => {
    course.timesString =
      course.times.map((t) => `${t.요일} ${t.시간}`).join(", ") || "시간 미정";
  });
}

// 필터 초기화
function initializeFilters() {
  const majorSelect = document.getElementById("majorSelect");
  const courseTypeSelect = document.getElementById("courseTypeSelect");
  const methodSelect = document.getElementById("methodSelect");

  // 기존 옵션 제거 (전체 옵션 제외)
  while (majorSelect.children.length > 1) {
    majorSelect.removeChild(majorSelect.lastChild);
  }
  while (courseTypeSelect.children.length > 1) {
    courseTypeSelect.removeChild(courseTypeSelect.lastChild);
  }
  while (methodSelect.children.length > 1) {
    methodSelect.removeChild(methodSelect.lastChild);
  }

  // 전공 옵션 추가
  const majors = [...new Set(coursesData.map((course) => course.전공))]
    .filter(Boolean)
    .sort();
  majors.forEach((major) => {
    const option = document.createElement("option");
    option.value = major;
    option.textContent = major;
    majorSelect.appendChild(option);
  });

  // 이수구분 옵션 추가
  const courseTypes = [...new Set(coursesData.map((course) => course.이수구분))]
    .filter(Boolean)
    .sort();
  courseTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    courseTypeSelect.appendChild(option);
  });

  // 수업방법 옵션 추가
  const methods = [...new Set(coursesData.map((course) => course.수업방법))]
    .filter(Boolean)
    .sort();
  methods.forEach((method) => {
    const option = document.createElement("option");
    option.value = method;
    option.textContent = method;
    methodSelect.appendChild(option);
  });
}

// 과목 필터링
function filterCourses() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const selectedMajor = document.getElementById("majorSelect").value;
  const selectedCourseType = document.getElementById("courseTypeSelect").value;
  const selectedMethod = document.getElementById("methodSelect").value;

  filteredCourses = coursesData.filter((course) => {
    const matchesSearch =
      !searchTerm || course.교과목명.toLowerCase().includes(searchTerm);
    const matchesMajor = !selectedMajor || course.전공 === selectedMajor;
    const matchesCourseType =
      !selectedCourseType || course.이수구분 === selectedCourseType;
    const matchesMethod = !selectedMethod || course.수업방법 === selectedMethod;

    return matchesSearch && matchesMajor && matchesCourseType && matchesMethod;
  });
}

// 과목 목록 업데이트
function updateCourseList() {
  filterCourses();
  const courseList = document.getElementById("courseList");

  if (filteredCourses.length === 0) {
    courseList.innerHTML = `<div class="loading-message">검색 조건에 맞는 과목이 없습니다.</div>`;
    return;
  }

  courseList.innerHTML = "";

  filteredCourses.forEach((course) => {
    const courseItem = document.createElement("div");
    courseItem.className = "course-item";
    courseItem.dataset.sectionId = course.section_id;

    const isSelected = selectedCourses.some(
      (sc) => sc.section_id === course.section_id
    );
    if (isSelected) {
      courseItem.classList.add("selected");
    }

    courseItem.innerHTML = `
      <div class="course-name">${course.교과목명} (${course.학점}학점)</div>
      <div class="course-details">
        👨‍🏫 ${course.교수명} | ${course.이수구분} | ${course.전공}<br>
        📅 ${course.timesString}<br>
        💻 ${course.수업방법}
      </div>
    `;

    courseItem.addEventListener("click", () => toggleCourse(course));
    courseList.appendChild(courseItem);
  });
}

// 과목 선택/해제 토글
function toggleCourse(course) {
  const existingIndex = selectedCourses.findIndex(
    (sc) => sc.section_id === course.section_id
  );

  if (existingIndex >= 0) {
    selectedCourses.splice(existingIndex, 1);
  } else {
    selectedCourses.push(course);
  }

  updateCourseList();
  updateSelectedCourses();
  updateCreditsDisplay();
  renderSchedule();
}

// 선택된 과목 표시 업데이트
function updateSelectedCourses() {
  const selectedCoursesDiv = document.getElementById("selectedCourses");
  const clearAllBtn = document.getElementById("clearAllBtn");

  if (selectedCourses.length === 0) {
    selectedCoursesDiv.innerHTML =
      '<div class="loading-message">선택된 과목이 없습니다.</div>';
    clearAllBtn.style.display = "none";
    return;
  }

  clearAllBtn.style.display = "block";
  selectedCoursesDiv.innerHTML = "";

  selectedCourses.forEach((course) => {
    const courseCard = document.createElement("div");
    courseCard.className = "selected-course-card";

    courseCard.innerHTML = `
      <div class="selected-course-info">
        <div class="selected-course-title">${course.교과목명} (${course.학점}학점)</div>
        <div class="selected-course-details">${course.교수명} | ${course.전공}</div>
      </div>
      <button class="remove-btn" onclick="removeCourse('${course.section_id}')">❌</button>
    `;

    selectedCoursesDiv.appendChild(courseCard);
  });
}

// 과목 제거
function removeCourse(sectionId) {
  selectedCourses = selectedCourses.filter(
    (course) => course.section_id !== sectionId
  );
  updateCourseList();
  updateSelectedCourses();
  updateCreditsDisplay();
  renderSchedule();
}

// 전체 초기화
function clearAllCourses() {
  selectedCourses = [];
  updateCourseList();
  updateSelectedCourses();
  updateCreditsDisplay();
  renderSchedule();
}

// 학점 표시 업데이트
function updateCreditsDisplay() {
  const totalCredits = selectedCourses.reduce(
    (sum, course) => sum + course.학점,
    0
  );
  const courseCount = selectedCourses.length;

  document.getElementById(
    "totalCredits"
  ).textContent = `총 학점: ${totalCredits}학점`;
  document.getElementById(
    "courseCount"
  ).textContent = `선택된 과목 수: ${courseCount}개`;
}

// 시간표 렌더링 (5분 단위 정밀도)
function renderSchedule() {
  const scheduleBody = document.getElementById("scheduleBody");
  scheduleBody.innerHTML = "";

  const days = ["월", "화", "수", "목", "금"];

  // 그리드 생성 (1시간당 하나의 셀, 내부에서 5분 단위로 배치)
  timeSlots.forEach((timeSlot, timeIndex) => {
    // 시간 슬롯
    const timeSlotDiv = document.createElement("div");
    timeSlotDiv.className = "time-slot";
    timeSlotDiv.textContent = timeSlot;
    scheduleBody.appendChild(timeSlotDiv);

    // 각 요일별 셀
    days.forEach((day, dayIndex) => {
      const cellDiv = document.createElement("div");
      cellDiv.className = "schedule-cell";
      cellDiv.dataset.day = day;
      cellDiv.dataset.time = timeIndex;
      cellDiv.style.position = "relative";
      scheduleBody.appendChild(cellDiv);
    });
  });

  // 선택된 과목들을 시간표에 배치 (5분 단위 정밀도)
  selectedCourses.forEach((course, courseIndex) => {
    const color = colors[courseIndex % colors.length];

    course.times.forEach((timeInfo) => {
      const dayIndex = days.indexOf(timeInfo.요일);
      if (dayIndex === -1) return;

      const precisePosition = timeToGridPosition(timeInfo.시간);
      if (precisePosition === null) return;

      const duration = getTimeDuration(timeInfo.시간);

      console.log(`[DEBUG] ${course.교과목명} - ${timeInfo.시간}`);
      console.log(`  정밀위치: ${precisePosition}, 지속시간: ${duration}`);

      // 어느 시간 슬롯에 속하는지 계산
      const hourSlot = Math.floor(precisePosition / 12); // 12개의 5분 단위 = 1시간
      const minuteOffset = (precisePosition % 12) / 12; // 시간 내에서의 위치 (0~1)

      console.log(`  시간슬롯: ${hourSlot}, 분오프셋: ${minuteOffset}`);

      // 해당 셀 찾기
      const targetCell = scheduleBody.querySelector(
        `[data-day="${timeInfo.요일}"][data-time="${hourSlot}"]`
      );

      if (targetCell) {
        const courseBlock = document.createElement("div");
        courseBlock.className = "course-block";
        courseBlock.style.backgroundColor = color;

        // 5분 단위 정밀 배치
        const cellHeight = 60; // CSS에서 설정된 셀 높이
        const blockHeight = Math.max(15, duration * 5); // 5분당 5px, 최소 15px
        const topOffset = minuteOffset * cellHeight;

        courseBlock.style.position = "absolute";
        courseBlock.style.top = `${topOffset}px`;
        courseBlock.style.height = `${blockHeight}px`;
        courseBlock.style.left = "2px";
        courseBlock.style.right = "2px";
        courseBlock.style.zIndex = "10";

        // 시간에 따른 폰트 크기 조정
        const fontSize =
          blockHeight > 40
            ? "0.85rem"
            : blockHeight > 20
            ? "0.75rem"
            : "0.65rem";
        courseBlock.style.fontSize = fontSize;

        console.log(`  블록높이: ${blockHeight}px, 상단오프셋: ${topOffset}px`);

        courseBlock.innerHTML = `
          <div class="course-block-title">${course.교과목명}</div>
          <div class="course-block-professor">${course.교수명}</div>
          <div class="course-block-time" style="font-size: 0.7em; opacity: 0.8;">${
            timeInfo.시간.split(" ~ ")[0]
          }</div>
        `;

        targetCell.appendChild(courseBlock);
      }
    });
  });
}

// 시간표 CSV 내보내기 (UTF-8 BOM)
function exportSchedule() {
  if (selectedCourses.length === 0) {
    alert("선택된 과목이 없습니다.");
    return;
  }

  let csvContent = "과목명,교수명,전공,이수구분,학점,수업방법,시간\n";

  selectedCourses.forEach((course) => {
    const timeString = course.timesString || "시간 미정";
    const courseName = `"${course.교과목명.replace(/"/g, '""')}"`;
    const professor = `"${course.교수명.replace(/"/g, '""')}"`;
    const major = `"${course.전공.replace(/"/g, '""')}"`;
    const courseType = `"${course.이수구분.replace(/"/g, '""')}"`;
    const method = `"${course.수업방법.replace(/"/g, '""')}"`;
    const times = `"${timeString.replace(/"/g, '""')}"`;

    csvContent += `${courseName},${professor},${major},${courseType},${course.학점},${method},${times}\n`;
  });

  try {
    const BOM = "\uFEFF";
    const csvWithBOM = BOM + csvContent;

    const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const fileName = `my_schedule_${new Date().toISOString().slice(0, 10)}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`✅ 시간표 CSV 파일 다운로드 완료: ${fileName}`);
  } catch (error) {
    console.error("CSV 내보내기 실패:", error);
    alert("CSV 파일 생성에 실패했습니다.");
  }
}

// 인쇄용 함수 (브라우저 인쇄)
function printSchedule() {
  const printStyles = `
    <style>
      @media print {
        .sidebar { display: none !important; }
        .export-section { display: none !important; }
        .main-content { flex-direction: column !important; }
        .schedule-container { 
          width: 100% !important; 
          margin: 0 !important;
          padding: 0 !important;
        }
        .schedule-grid { 
          width: 100% !important; 
          min-width: auto !important;
          page-break-inside: avoid;
        }
        .credits-display {
          margin-bottom: 1rem;
          break-after: avoid;
        }
        body { 
          background: white !important; 
          padding: 1rem !important;
        }
        .container {
          box-shadow: none !important;
          border-radius: 0 !important;
        }
      }
    </style>
  `;

  const head = document.head;
  const printStyleElement = document.createElement("style");
  printStyleElement.innerHTML = printStyles;
  head.appendChild(printStyleElement);

  window.print();

  setTimeout(() => {
    head.removeChild(printStyleElement);
  }, 1000);
}

// 이벤트 리스너 설정
function setupEventListeners() {
  document
    .getElementById("searchInput")
    .addEventListener("input", updateCourseList);
  document
    .getElementById("majorSelect")
    .addEventListener("change", updateCourseList);
  document
    .getElementById("courseTypeSelect")
    .addEventListener("change", updateCourseList);
  document
    .getElementById("methodSelect")
    .addEventListener("change", updateCourseList);
  document
    .getElementById("clearAllBtn")
    .addEventListener("click", clearAllCourses);
  document
    .getElementById("exportBtn")
    .addEventListener("click", exportSchedule);
  document.getElementById("printBtn").addEventListener("click", printSchedule);
}

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  setupEventListeners();
  loadCSVData();
});
