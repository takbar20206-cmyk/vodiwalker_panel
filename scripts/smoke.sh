#!/bin/bash
# GAMER ID end-to-end smoke test (no fake data — real user flows)
set -u
BASE=http://localhost:3000
CJ1=/tmp/gid_u1.txt
CJ2=/tmp/gid_u2.txt
CJ_ADMIN=/tmp/gid_admin.txt
rm -f $CJ1 $CJ2 $CJ_ADMIN
PASS=0; FAIL=0

check() {
  local name="$1" cond="$2"
  local ok=1
  if [[ "$cond" =~ ^[0-9]+$ ]]; then
    # raw exit code from $?
    [ "$cond" -eq 0 ] && ok=0
  elif eval "$cond"; then
    ok=0
  fi
  if [ $ok -eq 0 ]; then PASS=$((PASS+1)); echo "✅ $name"; else FAIL=$((FAIL+1)); echo "❌ $name"; fi
}

echo "===== PAGES ====="
code=$(curl -s -o /tmp/p_home.html -w '%{http_code}' $BASE/)
check "home 200" "[ $code -eq 200 ]"
grep -q "YOUR GAMING IDENTITY" /tmp/p_home.html && grep -q "Create your gaming profile" /tmp/p_home.html
check "hero content" "$?"
code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/login)
check "login 200" "[ $code -eq 200 ]"
code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/register)
check "register 200" "[ $code -eq 200 ]"
code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/explore)
check "explore 200" "[ $code -eq 200 ]"
code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/leaderboard)
check "leaderboard 200" "[ $code -eq 200 ]"
code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/squads)
check "squads 200" "[ $code -eq 200 ]"
code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/challenges)
check "challenges 200" "[ $code -eq 200 ]"
code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/clans)
check "clans 200" "[ $code -eq 200 ]"
code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/games)
check "games 200" "[ $code -eq 200 ]"
code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/players)
check "players 200" "[ $code -eq 200 ]"
code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/nonexistent_user_xyz)
check "404 for unknown user" "[ $code -eq 404 ]"
code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/settings)
check "settings redirects unauth" "[ $code -eq 307 ] || [ $code -eq 308 ]"

echo "===== AUTH ====="
r=$(curl -s -c $CJ1 -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"shir_talabi","email":"shir@test.dev","password":"Secret#123","passwordConfirm":"Secret#123"}')
echo "$r" | grep -q '"ok":true'
check "register user1" "$?"
grep -q gid_session $CJ1
check "session cookie set" "$?"

r=$(curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"shir_talabi","email":"x@test.dev","password":"Secret#123","passwordConfirm":"Secret#123"}')
echo "$r" | grep -q 'USERNAME_TAKEN\|already taken\|taken'
check "duplicate username rejected" "$?"

r=$(curl -s -c $CJ2 -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"kian_pro","email":"kian@test.dev","password":"Secret#123","passwordConfirm":"Secret#123"}')
echo "$r" | grep -q '"ok":true'
check "register user2" "$?"

# real user ids
U1=$(curl -s -b $CJ1 $BASE/api/auth/me | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])")
U2=$(curl -s -b $CJ2 $BASE/api/auth/me | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])")
echo "(user ids: U1=$U1 U2=$U2)"

r=$(curl -s -c /tmp/gid_logout.txt -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"identifier":"shir@test.dev","password":"Secret#123"}')
echo "$r" | grep -q '"ok":true'
check "login by email" "$?"

r=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"identifier":"shir_talabi","password":"WRONG"}')
echo "$r" | grep -q 'Invalid'
check "wrong password rejected" "$?"

r=$(curl -s -c $CJ1 -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"identifier":"shir_talabi","password":"Secret#123"}')
echo "$r" | grep -q '"ok":true'
check "login by username" "$?"

r=$(curl -s -b $CJ1 $BASE/api/auth/me)
echo "$r" | grep -q '"username":"shir_talabi"'
check "me endpoint" "$?"

echo "===== PROFILE ====="
r=$(curl -s -b $CJ1 -X PATCH $BASE/api/profile -H 'Content-Type: application/json' \
  -d '{"display_name":"Shir Talabi","bio":"Pro FPS player from Tehran","country":"IR","show_country":1}')
echo "$r" | grep -q '"ok":true'
check "update profile" "$?"

r=$(curl -s $BASE/api/users/shir_talabi)
echo "$r" | grep -q 'Shir Talabi'
check "public profile shows display name" "$?"
echo "$r" | grep -q 'Tehran'
check "bio visible" "$?"

echo "===== GAMES ====="
games=$(curl -s $BASE/api/games)
echo "$games" | grep -q 'Call of Duty'
check "games catalog has COD" "$?"
echo "$games" | grep -q 'Warzone'
check "games catalog has Warzone" "$?"
# find valorant id
VAL_ID=$(echo "$games" | python3 -c "import sys,json; d=json.load(sys.stdin); print([g['id'] for g in d['games'] if g['slug']=='valorant'][0])")
CS2_ID=$(echo "$games" | python3 -c "import sys,json; d=json.load(sys.stdin); print([g['id'] for g in d['games'] if g['slug']=='cs2'][0])")

r=$(curl -s -b $CJ1 -X POST $BASE/api/games -H 'Content-Type: application/json' \
  -d "{\"game_id\":$VAL_ID,\"hours\":540,\"rank\":\"Immortal 2\",\"level\":87,\"main_character\":\"Jett\",\"main_weapon\":\"Vandal\",\"platform\":\"PC\"}")
echo "$r" | grep -q '"ok":true'
check "add game (Valorant)" "$?"

r=$(curl -s -b $CJ1 -X POST $BASE/api/games -H 'Content-Type: application/json' \
  -d "{\"game_id\":$CS2_ID,\"hours\":1200,\"rank\":\"Global Elite\",\"level\":3,\"main_character\":\"—\",\"main_weapon\":\"AK-47\",\"platform\":\"PC\"}")
echo "$r" | grep -q '"ok":true'
check "add game (CS2)" "$?"

r=$(curl -s "$BASE/api/games?userId=$U1")
echo "$r" | grep -q 'Immortal 2'
check "user games listed" "$?"

echo "===== POSTS / FEED ====="
r=$(curl -s -b $CJ1 -X POST $BASE/api/posts -H 'Content-Type: application/json' \
  -d '{"content":"Grinding Valorant ranked today 🎯"}')
echo "$r" | grep -q '"ok":true'
check "create post" "$?"
POST_ID=$(echo "$r" | python3 -c "import sys,json; print(json.load(sys.stdin)['post']['id'])")

r=$(curl -s "$BASE/api/posts?scope=all")
echo "$r" | grep -q 'Grinding Valorant'
check "feed shows post" "$?"

echo "===== LIKES / COMMENTS ====="
# login user2
curl -s -c $CJ2 -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"identifier":"kian_pro","password":"Secret#123"}' > /dev/null

r=$(curl -s -b $CJ2 -X POST $BASE/api/likes -H 'Content-Type: application/json' \
  -d "{\"target_type\":\"post\",\"target_id\":$POST_ID}")
echo "$r" | grep -q '"liked":true'
check "like post" "$?"
r=$(curl -s -b $CJ2 -X POST $BASE/api/likes -H 'Content-Type: application/json' \
  -d "{\"target_type\":\"post\",\"target_id\":$POST_ID}")
echo "$r" | grep -q '"liked":false'
check "unlike post (toggle)" "$?"
curl -s -b $CJ2 -X POST $BASE/api/likes -H 'Content-Type: application/json' -d "{\"target_type\":\"post\",\"target_id\":$POST_ID}" > /dev/null

r=$(curl -s -b $CJ2 -X POST $BASE/api/comments -H 'Content-Type: application/json' \
  -d "{\"target_type\":\"post\",\"target_id\":$POST_ID,\"content\":\"Nice grind! Add me for duo\"}")
echo "$r" | grep -q '"ok":true'
check "add comment" "$?"

r=$(curl -s "$BASE/api/comments?target_type=post&target_id=$POST_ID")
echo "$r" | grep -q 'Add me for duo'
check "comments listed" "$?"

echo "===== FOLLOW / FRIENDS ====="
r=$(curl -s -b $CJ2 -X POST $BASE/api/follow -H 'Content-Type: application/json' -d "{\"user_id\":$U1}")
echo "$r" | grep -q '"following":true'
check "follow user1" "$?"
r=$(curl -s -b $CJ2 -X POST $BASE/api/friends -H 'Content-Type: application/json' -d "{\"user_id\":$U1,\"action\":\"request\"}")
echo "$r" | grep -q '"status":"pending"'
check "friend request" "$?"
r=$(curl -s -b $CJ1 -X POST $BASE/api/friends -H 'Content-Type: application/json' -d "{\"user_id\":$U2,\"action\":\"accept\"}")
echo "$r" | grep -q '"status":"accepted"'
check "friend accept" "$?"
r=$(curl -s -b $CJ1 $BASE/api/friends)
echo "$r" | grep -q '"kian_pro"'
check "friends list" "$?"

echo "===== PROFILE RELATIONS ====="
r=$(curl -s -b $CJ2 $BASE/api/users/shir_talabi)
echo "$r" | grep -q '"following":true'
check "viewer sees following state" "$?"
echo "===== MESSAGES ====="
r=$(curl -s -b $CJ2 -X POST $BASE/api/messages -H 'Content-Type: application/json' -d "{\"user_id\":$U1}")
echo "$r" | grep -q '"threadId"'
check "create DM thread" "$?"
TH_ID=$(echo "$r" | python3 -c "import sys,json; print(json.load(sys.stdin)['threadId'])")
r=$(curl -s -b $CJ2 -X POST $BASE/api/messages/$TH_ID -H 'Content-Type: application/json' \
  -d '{"content":"Yo Shir, want to run ranked?"}')
echo "$r" | grep -q '"ok":true'
check "send message" "$?"
r=$(curl -s -b $CJ1 $BASE/api/messages/$TH_ID)
echo "$r" | grep -q 'want to run ranked'
check "receive message" "$?"
r=$(curl -s -b $CJ1 $BASE/api/messages)
echo "$r" | grep -q 'want to run ranked'
check "threads list has message" "$?"

echo "===== SQUADS ====="
r=$(curl -s -b $CJ1 -X POST $BASE/api/squads -H 'Content-Type: application/json' \
  -d "{\"game_id\":$VAL_ID,\"mode\":\"Ranked\",\"rank_needed\":\"Immortal+\",\"players_needed\":2,\"mic\":\"required\",\"language\":\"persian\",\"note\":\"Need 1 for radiant push\"}")
echo "$r" | grep -q '"ok":true'
check "create squad post" "$?"
SQ_ID=$(echo "$r" | python3 -c "import sys,json; print(json.load(sys.stdin)['squad']['id'])")
r=$(curl -s -b $CJ2 -X POST $BASE/api/squads/$SQ_ID/join -H 'Content-Type: application/json' -d '{"action":"join"}')
echo "$r" | grep -q '"joined":true'
check "join squad" "$?"
r=$(curl -s $BASE/api/squads)
echo "$r" | grep -q 'radiant push'
check "squad listed publicly" "$?"

echo "===== CHALLENGES ====="
r=$(curl -s $BASE/api/challenges)
echo "$r" | grep -q 'Get 20 kills in Ranked'
check "challenges seeded" "$?"
CH_ID=$(echo "$r" | python3 -c "import sys,json; print(json.load(sys.stdin)['challenges'][0]['id'])")
r=$(curl -s -b $CJ1 -X POST $BASE/api/challenges -H 'Content-Type: application/json' \
  -d "{\"challenge_id\":$CH_ID,\"action\":\"start\"}")
echo "$r" | grep -q '"status":"active"'
check "start challenge" "$?"
r=$(curl -s -b $CJ1 -X POST $BASE/api/challenges -H 'Content-Type: application/json' \
  -d "{\"challenge_id\":$CH_ID,\"action\":\"submit\",\"proof_note\":\"Match ID 482910 - 22 kills\"}")
echo "$r" | grep -q '"status":"completed"'
check "submit proof & complete" "$?"
echo "$r" | grep -q '"xp":'
check "challenge gives XP" "$?"

echo "===== LEADERBOARD ====="
r=$(curl -s "$BASE/api/leaderboard?scope=global&period=all")
echo "$r" | grep -q '"rank":1\|"rank": 1\|shir_talabi'
check "leaderboard has rows" "$?"

echo "===== NOTIFICATIONS ====="
r=$(curl -s -b $CJ1 $BASE/api/notifications)
echo "$r" | grep -q '"notifications"'
check "notifications endpoint" "$?"
echo "$r" | grep -q '"type":"follow"\|clip_saved\|comment\|squad_join\|friend'
check "has real notification types" "$?"

echo "===== CLANS ====="
r=$(curl -s -b $CJ1 -X POST $BASE/api/clans -H 'Content-Type: application/json' \
  -d '{"name":"Persian Ghosts","description":"Elite Iranian competitive clan","games":"Valorant, CS2, CODM"}')
echo "$r" | grep -q '"ok":true'
check "create clan" "$?"
CLAN_ID=$(echo "$r" | python3 -c "import sys,json; print(json.load(sys.stdin)['clan']['id'])")
r=$(curl -s -b $CJ2 -X POST $BASE/api/clans/$CLAN_ID -H 'Content-Type: application/json' -d '{"action":"join"}')
echo "$r" | grep -q '"status":"member"'
check "user2 joins clan" "$?"
r=$(curl -s $BASE/api/clans/$CLAN_ID)
echo "$r" | grep -q 'Persian Ghosts'
check "clan detail" "$?"
echo "$r" | grep -q 'kian_pro'
check "clan members listed" "$?"

echo "===== SEARCH ====="
r=$(curl -s "$BASE/api/search?q=Shir%20Talabi&type=players")
echo "$r" | grep -q 'shir_talabi'
check "search finds profile by display name" "$?"
r=$(curl -s "$BASE/api/search?q=Persian&type=clans")
echo "$r" | grep -q 'Persian Ghosts'
check "search finds clan" "$?"
r=$(curl -s "$BASE/api/search?q=Valorant&type=games")
echo "$r" | grep -q 'Valorant'
check "search finds game" "$?"

echo "===== REPORTS ====="
r=$(curl -s -b $CJ2 -X POST $BASE/api/reports -H 'Content-Type: application/json' \
  -d "{\"target_type\":\"post\",\"target_id\":$POST_ID,\"reason\":\"spam\",\"details\":\"test report\"}")
echo "$r" | grep -q '"ok":true'
check "create report" "$?"

echo "===== ADMIN ====="
r=$(curl -s -c $CJ_ADMIN -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"identifier":"admin@gamerid.gg","password":"GamerID#Admin2026"}')
echo "$r" | grep -q '"ok":true'
check "admin login" "$?"
r=$(curl -s -b $CJ_ADMIN "$BASE/api/admin?tab=dashboard")
echo "$r" | grep -q '"total_users"'
check "admin dashboard stats" "$?"
echo "$r" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['stats']['total_users'] >= 3"
check "total_users >= 3" "$?"
echo "$r" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['stats']['reports_open'] >= 1"
check "open report counted" "$?"
r=$(curl -s -b $CJ_ADMIN "$BASE/api/admin?tab=reports")
echo "$r" | grep -q 'test report'
check "admin sees reports" "$?"
r=$(curl -s -b $CJ_ADMIN -X POST $BASE/api/admin -H 'Content-Type: application/json' \
  -d '{"action":"resolve_report","id":1,"status":"resolved","note":"ok"}')
echo "$r" | grep -q '"status":"resolved"'
check "resolve report" "$?"

# admin forbids regular user
r=$(curl -s -b $CJ2 -o /dev/null -w '%{http_code}' "$BASE/api/admin?tab=dashboard")
check "admin API blocked for normal user [403]" "[ $code -ne 200 ] && [ $r -eq 403 ]"

echo "===== AUTH GUARDS ====="
code=$(curl -s -b $CJ2 -o /dev/null -w '%{http_code}' -X POST $BASE/api/profile -H 'Content-Type: application/json' -d '{"language":"en"}')
check "profile PATCH works authed [200]" "[ $code -eq 200 ]"
code=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $BASE/api/profile -H 'Content-Type: application/json' -d '{"display_name":"hack"}')
check "profile PATCH blocked unauth [401]" "[ $code -eq 401 ]"
code=$(curl -s -b $CJ2 -o /dev/null -w '%{http_code}' -X DELETE "$BASE/api/posts?id=$POST_ID")
check "cannot delete others' post [403]" "[ $code -eq 403 ]"

echo "===== DAILY XP ====="
r=$(curl -s -b $CJ2 -X POST $BASE/api/daily)
echo "$r" | grep -q '"ok":true\|"already":true'
check "daily reward endpoint" "$?"

echo ""
echo "==============================="
echo "PASS: $PASS  FAIL: $FAIL"
echo "==============================="
[ $FAIL -eq 0 ] && echo "ALL GREEN 🎉" || echo "SOME TESTS FAILED"
