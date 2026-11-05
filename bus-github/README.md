# 버스 온타임

국토교통부 TAGO 버스도착정보 API로 정류소별 실시간 도착 정보를 조회하는 반응형 웹앱입니다. Node.js 기본 모듈만 사용하므로 npm 패키지 설치가 필요 없습니다.

## 로컬 실행

1. Node.js 22 이상을 설치합니다.
2. 이 폴더에서 터미널을 엽니다.
3. `.env.local`이 없으면 `.env.example`을 복사해 `.env.local`을 만들고 인증키를 넣습니다. 로컬 작업 폴더에는 전달받은 키가 설정되어 있습니다.
4. `npm start` 실행 후 http://localhost:3001 에 접속합니다.

도시를 선택하고 TAGO 정류소 ID를 입력합니다. 기본 입력값 `25 / DJB8001793`은 공식 명세의 대전 예시입니다. 실제 도착 정보는 조회 시점에 따라 없을 수 있습니다. 일반 정류장 번호와 TAGO ID는 다릅니다. 이 API는 정류소 이름 검색 기능을 제공하지 않습니다. 정류소 ID는 공공데이터포털의 ‘국토교통부_(TAGO)_버스정류소정보’에서 조회하세요. 해당 서비스는 별도 활용신청이 필요할 수 있습니다.

## GitHub에 폴더 업로드

`bus-github.zip`을 풀면 GitHub 업로드용 파일이 들어 있습니다. 새 저장소의 **Add file → Upload files**에 압축을 푼 폴더 안 파일들을 올립니다. ZIP 자체를 올리지 마세요. 숨김 파일 `.gitignore`, `.env.example`도 포함합니다. 로컬 `bus` 폴더를 Git으로 올려도 됩니다. `.env.local`은 자동 제외됩니다.

```powershell
git init
git add .
git commit -m "Create bus arrival app"
git branch -M main
git remote add origin https://github.com/사용자명/저장소명.git
git push -u origin main
```

## Vercel 배포

1. GitHub 저장소를 Vercel의 **Add New → Project**로 가져옵니다.
2. 저장소 루트에 이 프로젝트 파일을 올렸으면 Root Directory는 기본값을 사용합니다. 저장소 안의 `bus` 폴더로 올렸으면 Root Directory를 `bus`로 지정합니다.
3. Framework Preset은 **Other**, Build Command는 비워 둡니다. `vercel.json`이 설정을 제공합니다.
4. 환경변수 `DATA_GO_KR_SERVICE_KEY`에 전달받은 공공데이터포털 인증키를 넣고 배포합니다. 나중에 환경변수를 변경하면 다시 배포합니다.

GitHub Pages는 정적 파일 전용이므로 이 Node.js API 서버를 실행할 수 없습니다. 웹앱 실행에는 로컬 Node.js 또는 Vercel이 필요합니다.

## 기능

- API에서 도시 목록 조회 및 도시코드 직접 입력
- 정류소별 도착 예정 시간, 남은 정류소 수, 노선/차량 유형
- 노선번호 필터, 도착순/노선순 정렬
- 브라우저별 즐겨찾기와 마지막 조회 입력값 저장
- 선택 시 30초 자동 새로고침 (탭이 숨겨지면 중단)
- 빈 결과, 인증 오류, 네트워크 오류, 타임아웃 안내

## 검증

`npm test`로 API 응답 정규화, 오류 처리, 요청 파라미터와 페이지 처리를 검증합니다.

## API

- `GET /api/bus?action=cities`
- `GET /api/bus?action=arrivals&cityCode=25&nodeId=DJB8001793`

서버가 공식 API를 호출합니다. 인증키는 `.env.local` 또는 서버 환경변수에서 읽습니다. 배포 시 소스에 키를 추가할 필요는 없습니다.

공식 명세: https://www.data.go.kr/data/15098530/openapi.do

원본 서비스: https://apis.data.go.kr/1613000/ArvlInfoInqireService
