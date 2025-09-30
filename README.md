# 🚀 Rodi-X Preview Server

Rodi-X 커스텀 컴포넌트를 표준 HTML로 실시간 변환하여 프리뷰를 제공하는 개발 서버입니다.

## ✨ 주요 기능

- **실시간 변환**: Rodi-X 컴포넌트(XButton, XInput, XTable 등)를 표준 HTML로 자동 변환
- **V3 스타일 연동**: V3 프로젝트의 실제 RodiX 컴포넌트 스타일을 자동으로 로드
- **자동 리로드**: 파일 변경 감지 시 브라우저 자동 새로고침
- **개발 도구**: 원본/변환 HTML 비교, 변환 통계, 서버 상태 모니터링
- **중앙 설정 관리**: config.js에서 모든 경로와 설정을 통합 관리
- **상세 로깅**: 파일 변경, 변환 과정, 에러 등 상세 로그 제공
- **REST API**: 변환 결과 및 통계 조회 API

## 📦 설치

```bash
npm install
```

## ⚙️ 설정

`config.js` 파일에서 모든 경로를 중앙 관리합니다:

```javascript
// V3 프로젝트 루트 경로
const V3_ROOT = 'C:/git/v3/v3';

// 프리뷰할 HTML 파일
const HTML_FOLDER = path.join(V3_ROOT, 'src/rodi/code/plugins.debug/YourPlugin/htmlStore');
const HTML_FILE = 'YourFile.html';
```

### 주요 설정 항목

- **V3_ROOT**: V3 프로젝트 루트 경로 (모든 경로의 기준점)
- **HTML_FOLDER**: 프리뷰할 HTML 파일이 있는 폴더
- **HTML_FILE**: 프리뷰할 HTML 파일명
- **RODIX_COMPONENTS_DIR**: RodiX 컴포넌트 스타일 경로 (자동 설정)

## 🚀 실행

```bash
# 기본 실행
npm start

# 개발 모드 (nodemon - 코드 변경 시 자동 재시작)
npm run dev
```

## 📱 사용 방법

1. 서버 시작 후 브라우저에서 `http://localhost:3000` 접속
2. HTML 파일이 실시간으로 변환되어 표시됩니다
3. 원본 HTML 파일을 수정하면 자동으로 브라우저가 새로고침됩니다

## 🛠️ 개발 도구

프리뷰 페이지 상단의 개발 도구를 통해:

- **📊 통계**: 변환 횟수, 서버 가동 시간, 연결된 클라이언트 수
- **📝 원본 HTML**: Rodi-X 컴포넌트가 포함된 원본 HTML 코드
- **✨ 변환 HTML**: 표준 HTML로 변환된 최종 코드
- **🔄 새로고침**: 수동으로 프리뷰 새로고침

## 🔌 API 엔드포인트

- `GET /` - 프리뷰 페이지
- `GET /api/status` - 서버 상태 및 통계
- `GET /api/source` - 원본 HTML 조회
- `GET /api/converted` - 변환된 HTML 조회
- `GET /api/converter/stats` - 변환 통계
- `POST /api/converter/reset` - 통계 초기화

## 🎯 지원하는 Rodi-X 컴포넌트

### 기본 컴포넌트
- XButton, XInput, XLabel, XSpan, XDiv
- XTable, XRow, XCell
- XImage, XParagraph, XHeading, XLink

### 폼 컴포넌트
- XRadio, XCheckBox, XSlider
- XSelectBox, XOption, XTextArea

### 복합 컴포넌트
- XTableList, XPaginate
- XContainer, XSection

## 📝 변환 예시

**Rodi-X 입력:**
```html
<XButton text="클릭" id="myBtn" />
<XInput id="myInput" value="테스트" />
```

**표준 HTML 출력:**
```html
<button id="myBtn">클릭</button>
<input id="myInput" value="테스트">
```

## 🔧 기술 스택

- **Express**: 웹 서버
- **Socket.IO**: 실시간 양방향 통신
- **Chokidar**: 파일 변경 감지
- **Node.js**: 서버 런타임

## 📁 프로젝트 구조

```
rodi-x-preview/
├── config.js                 # ⚙️ 중앙 설정 파일 (경로 관리)
├── styleLoader.js            # 🎨 V3 스타일 로더
├── server.js                 # 🚀 메인 서버
├── rodiConverter-simple.js   # 🔄 컴포넌트 변환기
├── package.json
└── README.md
```

## 🚨 문제 해결

### 파일을 찾을 수 없다는 오류
- `config.js`의 `V3_ROOT` 경로 확인
- `HTML_FOLDER`와 `HTML_FILE` 설정 확인
- 파일이 실제로 존재하는지 확인

### RodiX 스타일이 적용되지 않음
- `config.js`의 `V3_ROOT` 경로가 올바른지 확인
- `RODIX_COMPONENTS_DIR` 경로에 실제 컴포넌트 폴더가 있는지 확인
- 서버 시작 시 "RodiX 스타일 확인" 메시지에서 로드된 컴포넌트 수 확인

### 컴포넌트가 제대로 변환되지 않음
- 컴포넌트 이름의 대소문자 확인 (`XButton`, `XInput` 등)
- 닫는 태그가 올바른지 확인
- 브라우저 개발자 도구에서 변환된 HTML 확인

### 브라우저가 자동으로 리로드되지 않음
- Socket.IO 연결 상태 확인 (상단 헤더의 연결 상태 표시)
- 서버 터미널에서 파일 변경 감지 메시지 확인
- 방화벽이 WebSocket 연결을 차단하는지 확인

## 📄 라이선스

MIT