---
title: 소화전 추가하기
description: Hydrantenjäger, StreetComplete, Every Door, iD 편집기 또는 JOSM으로 OpenStreetMap에 소화전, 급수 지점과 자동심장충격기를 추가하는 방법.
eyebrow: 기여하기
lead: 지도에 있는 모든 소화전은 누군가 추가한 것입니다. 빠진 것이 있으면 직접 추가할 수 있습니다. 무료 OpenStreetMap 계정만 있으면 됩니다.
order: 7
---

## 시작하기 전에 {#vorher}

OpenFireMap은 [OpenStreetMap](https://www.openstreetmap.org/)(OSM)의 데이터를 보여 줍니다. 따라서 OpenFireMap이 아니라 OpenStreetMap에서 편집해야 합니다. 계정이 필요합니다.

:::steps
1. [openstreetmap.org](https://www.openstreetmap.org/user/new)에서 **Sign Up**을 선택합니다.
2. 사용자 이름, 이메일과 비밀번호를 입력하고 이메일을 확인합니다.
3. 아래 도구에 같은 계정으로 로그인합니다.
:::

:::warn 세 가지 규칙
- **현장에서 직접 확인한 것만 추가하세요.** 소화전 앞에서 위치와 종류를 확인합니다.
- **다른 사람의 도면을 복사하지 마세요.** 수도 사업자나 지방자치단체의 소화전 도면은 저작권으로 보호됩니다. 명시적 허가가 있을 때만 사용하세요.
- **저장할 때 변경 사항을 간단히 설명하세요.** 예: “Main Street에 소화전 추가”.
:::

독일 소방서는 훈련 저녁이나 시내 답사 중 관할 구역의 소화전을 점검하는 독일어 안내를 [Für Feuerwehren](/help/fire-brigades/)에서 볼 수 있습니다.

## 어떤 도구가 적합할까요? {#werkzeug}

| 상황 | 도구 | 이유 |
|---|---|---|
| 휴대전화로 현장에서 빠르게 소화전을 추가 | **Hydrantenjäger** | 소화전 전용, 나침반으로 위치 지정, 입력 항목이 적음 |
| 이동하면서 주변 객체를 추가 | **StreetComplete** 또는 **Every Door** | 주변 객체에 관한 질문에 답변 |
| 컴퓨터에서 특정 장소를 편집 | **iD 편집기** | openstreetmap.org 브라우저에서 실행, 설치 불필요 |
| 여러 소화전을 편집하는 숙련자 | **JOSM**(컴퓨터) 또는 **Vespucci**(Android) | 모든 태그를 완전히 제어 |

## Hydrantenjäger 사용 {#hydrantenjaeger}

[Hydrantenjäger](https://hydrantenjaeger.de/)는 소화전 작업을 위해 만든 휴대전화용 웹 앱입니다.

:::steps
1. OpenStreetMap 계정으로 로그인합니다.
2. 소화전 앞 약 3미터에 서서 휴대전화를 향하게 합니다. 앱이 GPS와 나침반으로 위치를 지정합니다.
3. 종류와 위치를 선택하고 지름과 번호는 확실할 때만 추가합니다.
4. 업로드하면 끝입니다.
:::

모든 소화전 종류를 설명하는 자세한 내용은 [Hydrantenjäger 도움말](https://hydrantenjaeger.de/help/)에서 확인하세요.

## StreetComplete 또는 Every Door 사용 {#apps}

- **[StreetComplete](https://streetcomplete.app/)**(Android, iOS)은 “이 소화전의 종류는 무엇인가요?”처럼 근처 객체에 대한 질문을 표시합니다. 탭으로 답할 수 있습니다. 주로 기존 객체의 누락된 정보를 채우는 앱입니다.
- **[Every Door](https://every-door.app/)**(Android, iOS)는 점을 추가하는 앱입니다. 플러스 버튼으로 새 점을 놓고 “Fire Hydrant”를 선택해 필드를 채우세요.

## 브라우저에서 iD 편집기 사용 {#id}

iD는 openstreetmap.org의 기본 편집기입니다.

:::steps
1. [openstreetmap.org](https://www.openstreetmap.org/)를 열고 로그인한 뒤 소화전 위치를 확대합니다.
2. 위쪽의 **Edit**를 클릭합니다. 처음에는 짧은 안내가 나오니 읽어보세요.
3. 위쪽 **Point**를 클릭하고 소화전 위치에 정확히 점을 놓습니다. 항공 사진이 위치 확인에 도움이 됩니다.
4. 왼쪽 검색창에 “hydrant”를 입력하고 **Fire Hydrant** 프리셋을 선택합니다.
5. **Type**(지하식, 지주형, 벽면, 파이프), **Position**(예: 보도 또는 차도), **Diameter**, 알고 있으면 **Reference**를 입력합니다.
6. 오른쪽 위 **Save**를 누르고 짧은 설명을 쓴 뒤 **Upload**합니다.
:::

:::tip 기존 소화전 수정
기존 소화전을 클릭하고 왼쪽 필드를 고친 뒤 같은 방법으로 저장합니다. 위치가 틀리면 올바른 곳으로 끌어 옮기세요. 현장에서 더 이상 존재하지 않는 것이 확실할 때만 삭제합니다.
:::

## JOSM 또는 Vespucci 사용 {#josm}

[JOSM](https://josm.openstreetmap.de/)은 컴퓨터용 Java 편집기이고 [Vespucci](https://vespucci.io/)는 Android용입니다. 두 도구 모두 모든 태그를 직접 보여 주며, 답사 후 관할 구역의 소화전을 대량 업데이트하는 등 큰 작업에 적합합니다. 주요 태그는 아래에 있습니다.

## 중요한 태그 {#tags}

OpenStreetMap 객체는 `key=value` 형식의 태그로 설명합니다. 앱의 프리셋이 자동으로 입력합니다. 직접 지정하려면 다음을 사용하세요.

| 객체 | 태그 | 의미 |
|---|---|---|
| 소화전 | `emergency=fire_hydrant` | 모든 소화전에 필수 |
| | `fire_hydrant:type=underground` | 지하식(또는 `pillar`, `wall`, `pipe`) |
| | `fire_hydrant:diameter=80` | 표지에 표시된 공칭 지름(DN) |
| | `fire_hydrant:position=sidewalk` | 위치(또는 `lane`, `parking_lot`, `green`) |
| | `ref=123` | 번호가 있으면 소화전 번호 |
| | `fire_hydrant:pressure=4` | 압력(bar), 알고 있을 때만 |
| 흡수 지점 | `emergency=suction_point` | 수역에서 물을 끌어올리는 장소 |
| 물탱크 | `emergency=water_tank` | 저수조 또는 소방용 물탱크 |
| 소방용 연못 | `emergency=fire_water_pond` | 소방용수원으로 사용하는 연못 |
| 자동심장충격기 | `emergency=defibrillator` | `indoor=yes/no`, `defibrillator:location=…`, `opening_hours=…`도 추가 |
| 소방서 | `amenity=fire_station` | 소방서 건물 또는 부지 |

[지도 기호](/symbols/)에서 태그가 OpenFireMap에 표시되는 방식을 볼 수 있습니다. [OpenStreetMap 위키](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant)에 자세한 내용이 있습니다.

## 변경 사항은 언제 표시되나요? {#anzeige}

업로드 후 소화전은 바로 OpenStreetMap에 저장됩니다. 지도에서 사용하는 서비스가 변경 사항을 처리한 후 OpenFireMap에 나타납니다. 보통 빠르지만 정확한 시간은 정해져 있지 않습니다. [데이터와 최신성](../data/#verzoegerung)에서 지연 이유를 설명합니다.
