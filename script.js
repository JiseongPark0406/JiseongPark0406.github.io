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

// (선택) 샘플 테스트 데이터
const testData = `section_id,분류,전공,이수구분,교과목명,학점,교수명,요일,교시/시간,수업방법
test1,전공,컴퓨터공학과,전필,자료구조,3.0,김교수,월,1-2A,오프라인
test1,전공,컴퓨터공학과,전필,자료구조,3.0,김교수,수,1-2A,오프라인
test2,전공,컴퓨터공학과,전선,웹프로그래밍,3.0,박교수,화,7-8A,블렌디드
test3,전공,산업경영공학과,기교,선형대수,3.0,장교수,목,2B-3,오프라인
test3,전공,산업경영공학과,기교,선형대수,3.0,장교수,목,4-5A,오프라인
test4,교양,교양학부,교필,대학영어,2.0,Smith,금,4-5A,오프라인`;

// (선택) 테스트 데이터 로더
function loadTestData() {
  coursesData = parseCSV(testData);
  groupCoursesBySection();
  initializeFilters();
  renderSchedule();
  document.getElementById("courseList").innerHTML = `
    <div class="loading-message" style="color: blue;">
      🧪 테스트 데이터로 실행 중<br>
      <small>${coursesData.length}개 과목 (샘플 데이터)</small>
    </div>
  `;
  setTimeout(updateCourseList, 300);
}

// CSV 파서
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
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

    if (row.section_id && row.교과목명) data.push(row);
  }
  return data;
}

// CSV 라인 파싱 (따옴표 처리)
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

// CSV 파일 로드 (UTF-8 우선, 깨짐 있으면 EUC-KR 재시도)
async function loadCSVData() {
  try {
    const response = await fetch("./course_schedule_with_section_id.csv");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    let decodedText = new TextDecoder("utf-8").decode(arrayBuffer);
    if (decodedText.includes("�")) {
      decodedText = new TextDecoder("euc-kr").decode(arrayBuffer);
    }

    coursesData = parseCSV(decodedText);
    if (coursesData.length === 0) throw new Error("파싱된 데이터가 없습니다.");

    groupCoursesBySection();
    initializeFilters();
    updateCourseList();
    renderSchedule();

    document.getElementById("courseList").innerHTML = `
      <div class="loading-message" style="color: green;">
        ${coursesData.length}개 과목을 불러왔습니다!
      </div>`;
    setTimeout(updateCourseList, 300);
  } catch (error) {
    console.error("CSV 파일 로드 실패:", error);
    document.getElementById("courseList").innerHTML = `
      <div class="loading-message" style="color: red;">
        ❌ 데이터 로드 실패: ${error.message}<br>
        <small>파일 경로와 인코딩을 확인해주세요.</small>
      </div>`;
  }
}

// 섹션(수업 묶음)으로 그룹화
function groupCoursesBySection() {
  const sectionMap = new Map();

  coursesData.forEach((course) => {
    const sectionId = course.section_id;
    if (!sectionMap.has(sectionId)) {
      sectionMap.set(sectionId, {
        section_id: sectionId,
        분류: course.분류,
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
  const categorySelect = document.getElementById("categorySelect");
  const majorSelect = document.getElementById("majorSelect");
  const courseTypeSelect = document.getElementById("courseTypeSelect");
  const methodSelect = document.getElementById("methodSelect");

  // 분류 옵션 (CSV가 갖고 있는 분류들)
  const categories = [...new Set(coursesData.map((c) => c.분류))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ko-KR"));
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });

  // 전공 옵션
  const majors = [...new Set(coursesData.map((c) => c.전공))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ko-KR"));
  majors.forEach((major) => {
    const option = document.createElement("option");
    option.value = major; // 반드시 전공 문자열로
    option.textContent = major;
    majorSelect.appendChild(option);
  });

  // 이수구분 옵션
  const courseTypes = [...new Set(coursesData.map((c) => c.이수구분))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ko-KR"));
  courseTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    courseTypeSelect.appendChild(option);
  });

  // 수업방법 옵션
  const methods = [...new Set(coursesData.map((c) => c.수업방법))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ko-KR"));
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
  const selectedCategory = document.getElementById("categorySelect").value;
  const selectedMajor = document.getElementById("majorSelect").value;
  const selectedCourseType = document.getElementById("courseTypeSelect").value;
  const selectedMethod = document.getElementById("methodSelect").value;

  filteredCourses = coursesData.filter((course) => {
    const matchesCategory =
      !selectedCategory || course.분류 === selectedCategory;
    const matchesSearch =
      !searchTerm || course.교과목명.toLowerCase().includes(searchTerm);
    const matchesMajor = !selectedMajor || course.전공 === selectedMajor;
    const matchesCourseType =
      !selectedCourseType || course.이수구분 === selectedCourseType;
    const matchesMethod = !selectedMethod || course.수업방법 === selectedMethod;

    return (
      matchesSearch &&
      matchesMajor &&
      matchesCourseType &&
      matchesMethod &&
      matchesCategory
    );
  });
}

// 과목 목록 업데이트
function updateCourseList() {
  filterCourses();
  const courseList = document.getElementById("courseList");

  if (filteredCourses.length === 0) {
    courseList.innerHTML = `
      <div class="loading-message">
        검색 조건에 맞는 과목이 없습니다.
      </div>`;
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

// 시간을 그리드 위치로 변환 (시 기준)
function timeToGridPosition(timeString) {
  if (!timeString || timeString === "미정") return null;
  const [startTime] = timeString.split(" ~ ");
  const [hour] = startTime.split(":").map(Number);
  if (hour < 9 || hour > 21) return null;
  return hour - 9;
}

// 시간표 렌더링 (분 단위 배치 + 겹침 표시)
function renderSchedule() {
  const scheduleBody = document.getElementById("scheduleBody");
  scheduleBody.innerHTML = "";

  const days = ["월", "화", "수", "목", "금"];

  // 그리드 생성
  timeSlots.forEach((timeSlot, timeIndex) => {
    const timeSlotDiv = document.createElement("div");
    timeSlotDiv.className = "time-slot";
    timeSlotDiv.textContent = timeSlot;
    scheduleBody.appendChild(timeSlotDiv);

    days.forEach((day) => {
      const cellDiv = document.createElement("div");
      cellDiv.className = "schedule-cell";
      cellDiv.dataset.day = day;
      cellDiv.dataset.time = timeIndex;
      scheduleBody.appendChild(cellDiv);
    });
  });

  // 겹침 판별용 수집 배열 및 헬퍼
  const blocks = [];
  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const getStartEnd = (timeRange) => {
    const [s, e] = timeRange.split(" ~ ").map((t) => t.trim());
    return [toMinutes(s), toMinutes(e)];
  };

  // 선택된 과목들을 시간표에 배치 (분 단위 top/height)
  selectedCourses.forEach((course, courseIndex) => {
    const color = colors[courseIndex % colors.length];

    course.times.forEach((timeInfo) => {
      const [startTime, endTime] = timeInfo.시간
        .split(" ~ ")
        .map((s) => s.trim());
      if (!startTime || !endTime) return;

      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);

      const gridPosition = sh - 9; // 09:00이 0행
      if (gridPosition < 0 || gridPosition > 12) return;

      const targetCell = scheduleBody.querySelector(
        `[data-day="${timeInfo.요일}"][data-time="${gridPosition}"]`
      );
      if (!targetCell) return;

      // 1분 = 1px (셀 높이가 60px → 60분)
      const startOffsetPx = sm; // 시작 분 오프셋
      const totalMinutes = eh * 60 + em - (sh * 60 + sm);
      const blockHeightPx = Math.max(1, totalMinutes) - 4; // 여백

      const courseBlock = document.createElement("div");
      courseBlock.className = "course-block";
      courseBlock.style.backgroundColor = color;
      courseBlock.style.top = `${2 + startOffsetPx}px`; // 시작 분 반영
      courseBlock.style.height = `${blockHeightPx}px`; // 분 단위 높이
      courseBlock.innerHTML = `
        <div class="course-block-title">${course.교과목명}</div>
        <div class="course-block-professor">${course.교수명}</div>
      `;

      targetCell.appendChild(courseBlock);

      // 겹침 판별 메타 저장
      const [startMin, endMin] = getStartEnd(timeInfo.시간);
      courseBlock.dataset.day = timeInfo.요일;
      courseBlock.dataset.start = String(startMin);
      courseBlock.dataset.end = String(endMin);
      blocks.push(courseBlock);
    });
  });

  // 같은 요일 내 시간 구간이 겹치면 conflict 추가
  const byDay = {};
  blocks.forEach((b) => {
    const d = b.dataset.day;
    (byDay[d] ||= []).push(b);
  });

  Object.values(byDay).forEach((list) => {
    list.sort((a, b) => Number(a.dataset.start) - Number(b.dataset.start));
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (Number(list[j].dataset.start) < Number(list[i].dataset.end)) {
          list[i].classList.add("conflict");
          list[j].classList.add("conflict");
        } else {
          break;
        }
      }
    }
  });
}

// 시간표 내보내기 (UTF-8 BOM 추가로 Excel 깨짐 방지)
function exportSchedule() {
  if (selectedCourses.length === 0) {
    alert("선택된 과목이 없습니다.");
    return;
  }

  let csvContent = "과목명,교수명,전공,이수구분,학점,수업방법,시간\n";

  selectedCourses.forEach((course) => {
    const timeString = course.timesString || "시간 미정";
    csvContent += `"${course.교과목명}","${course.교수명}","${course.전공}","${course.이수구분}",${course.학점},"${course.수업방법}","${timeString}"\n`;
  });

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `my_schedule_${new Date().toISOString().slice(0, 10)}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 인쇄
function printSchedule() {
  window.print();
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 검색 입력
  document
    .getElementById("searchInput")
    .addEventListener("input", updateCourseList);

  // 필터 선택
  document
    .getElementById("majorSelect")
    .addEventListener("change", updateCourseList);
  document
    .getElementById("courseTypeSelect")
    .addEventListener("change", updateCourseList);
  document
    .getElementById("methodSelect")
    .addEventListener("change", updateCourseList);

  // 분류 변경 시: 전공 옵션 재구성(함수 없이 인라인) + 목록 갱신
  document.getElementById("categorySelect").addEventListener("change", () => {
    const category = document.getElementById("categorySelect").value; // '', '전공', '교양' 등
    const majorSelect = document.getElementById("majorSelect");
    const prev = majorSelect.value;

    const majors = [
      ...new Set(
        coursesData
          .filter((c) => !category || c.분류 === category)
          .map((c) => c.전공)
      ),
    ]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "ko-KR"));

    majorSelect.innerHTML = '<option value="">전체</option>';
    majors.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      majorSelect.appendChild(opt);
    });

    majorSelect.value = majors.includes(prev) ? prev : "";
    updateCourseList();
  });

  // 전체 초기화 버튼
  document
    .getElementById("clearAllBtn")
    .addEventListener("click", clearAllCourses);

  // 내보내기 버튼
  document
    .getElementById("exportBtn")
    .addEventListener("click", exportSchedule);
  document.getElementById("printBtn").addEventListener("click", printSchedule);
}

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  setupEventListeners();
  loadCSVData(); // 필요 시 loadTestData()로 교체하여 샘플로 테스트
});
