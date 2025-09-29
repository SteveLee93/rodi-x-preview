# Rodi-X Preview Server

Rodi-X 개발을 위한 실시간 HTML 프리뷰 서버입니다. Rodi-X 커스텀 컴포넌트를 표준 HTML로 변환하여 브라우저에서 실시간으로 확인할 수 있습니다.

## 🚀 주요 기능

- **실시간 프리뷰**: 파일 변경 시 자동으로 브라우저 리로드
- **컴포넌트 변환**: Rodi-X 커스텀 컴포넌트를 표준 HTML로 변환
- **개발자 도구**: 클릭, 입력 등의 상호작용을 콘솔에 로깅
- **간편한 설정**: 코드에서 파일 경로만 변경하면 즉시 프리뷰

## 📦 지원 컴포넌트

### 기본 컴포넌트
- `XButton` → `<button>` (text 속성 지원)
- `XInput` → `<input>`
- `XLabel` → `<label>`
- `XSpan` → `<span>`
- `XDiv` → `<div>`
- `XImage` → `<img>`

### 테이블 컴포넌트
- `XTable` → `<table>`
- `XRow` → `<tr>`
- `XCell` → `<td>` (isHeader, isColumnHeader 속성 지원)

### 폼 컴포넌트
- `XRadio` → `<label><input type="radio">` (자동으로 label로 감쌈)
- `XCheckBox` → `<label><input type="checkbox">` (자동으로 label로 감쌈)
- `XSlider` → `<input type="range">`
- `XSelectBox` → `<select>` (searchMode, placeholder 속성 지원)
- `XOption` → `<option>` (label 속성을 텍스트로 변환)

### 복합 컴포넌트
- `XTableList` → `<div>` (useAddButton, useDeleteButton 속성 지원)
- `XPaginate` → `<div>`

## 🛠 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 파일 경로 설정
`server.js` 파일의 `DEFAULT_FILE` 변수를 수정하세요:

```javascript
// 🎯 기본 로드할 파일 경로 (서버 시작 시 자동 로드)
const DEFAULT_FILE = '여기에_프리뷰할_HTML_파일_경로_입력';
```

### 3. 서버 실행
```bash
npm start
# 또는 개발 모드 (파일 변경 시 서버 자동 재시작)
npm run dev
```

### 4. 브라우저에서 확인
```
http://localhost:3000
```

## 📁 프로젝트 구조

```
rodi-x-preview/
├── server.js                    # 메인 서버 파일
├── rodiConverter-simple.js      # Rodi-X 컴포넌트 변환기
├── package.json                 # 프로젝트 설정
├── README.md                    # 문서
└── node_modules/                # 의존성 패키지
```

## 🔧 사용법

### 1. 기본 사용법
1. `server.js`에서 `DEFAULT_FILE` 경로 설정
2. `npm start`로 서버 실행
3. 브라우저에서 `http://localhost:3000` 접속
4. HTML 파일을 수정하면 자동으로 브라우저 리로드

### 2. 다른 파일로 변경
다른 파일을 프리뷰하려면 `DEFAULT_FILE` 경로를 변경하고 서버를 재시작하세요:

```javascript
// 예시들
const DEFAULT_FILE = 'C:\\path\\to\\your\\component.html';
const DEFAULT_FILE = 'C:\\git\\v3\\v3\\src\\rodi\\code\\plugins.debug\\PID_Tuning_for_AMC_2\\htmlStore\\PIDTuningWidgetNode.html';
const DEFAULT_FILE = 'C:\\git\\v3\\v3\\src\\rodi\\app\\plugins\\1.samples\\source\\Components\\htmlStore\\componentsExtensionNode.html';
```

### 3. 개발자 도구 활용
브라우저 개발자 도구(F12)의 콘솔에서 다음 정보를 확인할 수 있습니다:
- 버튼 클릭 이벤트
- 입력 필드 변경 사항
- 서버 연결 상태
- 파일 변경 감지

## 🎨 스타일링

변환된 HTML에는 다음 스타일이 자동으로 적용됩니다:
- 기본 테이블, 버튼, 입력 필드 스타일
- Radio/Checkbox를 위한 사용자 친화적 레이아웃
- 슬라이더 커스텀 디자인
- 셀렉트박스 스타일링
- PID 튜닝 위젯 전용 스타일

## 🚨 문제 해결

### 파일을 찾을 수 없다는 오류
- `DEFAULT_FILE` 경로가 올바른지 확인
- 백슬래시(`\\`)가 제대로 이스케이프되었는지 확인
- 파일이 실제로 존재하는지 확인

### 컴포넌트가 제대로 변환되지 않음
- 컴포넌트 이름의 대소문자 확인 (`XButton`, `XInput` 등)
- 닫는 태그가 올바른지 확인
- 중첩된 컴포넌트의 구조 확인

### 브라우저가 자동으로 리로드되지 않음
- Socket.IO 연결 상태 확인 (상단 헤더의 연결 상태 표시)
- 브라우저 콘솔에서 에러 메시지 확인
- 서버 터미널에서 파일 변경 감지 메시지 확인

## 📝 라이선스

MIT License