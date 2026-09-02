import { useState, useEffect, useMemo, useRef } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ---------------- date helpers ----------------
const START = new Date(2026, 8, 1); // Sep 1 2026
const END = new Date(2026, 11, 31); // Dec 31 2026
const TRACKED_DAYS = [1, 2, 4]; // Mon, Tue, Thu

function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fromKey(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatLong(d) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function formatShort(d) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function getValidDates() {
  const out = [];
  const cur = new Date(START);
  while (cur <= END) {
    if (TRACKED_DAYS.includes(cur.getDay())) out.push(toKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
function mondayOf(dateKey) {
  const d = fromKey(dateKey);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return toKey(d);
}
function groupByWeek(validDates) {
  const weeks = new Map();
  for (const dk of validDates) {
    const wk = mondayOf(dk);
    if (!weeks.has(wk)) weeks.set(wk, {});
    const dow = fromKey(dk).getDay();
    const label = dow === 1 ? "Mon" : dow === 2 ? "Tue" : "Thu";
    weeks.get(wk)[label] = dk;
  }
  return [...weeks.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

const VALID_DATES = getValidDates();
const WEEKS = groupByWeek(VALID_DATES);
const TODAY_KEY = toKey(new Date());
const PAST_DATES = VALID_DATES.filter((d) => d <= TODAY_KEY);

// ---------------- seed data ----------------
// name, tag, gender, telegram, yearOfStudy
const SEED_ROWS = [
  ["Lee Ang Xuan", "", "Female", "@a_xuanL", "Year 4"],
  ["Tan Kai Wen", "", "Female", "@kaiwen320", "Year 2"],
  ["Lim Ya Wen Deborah", "", "Female", "@croissants4ever", "Year 2"],
  ["Nericcia Tung Qi You", "", "Female", "@nymdream", "Year 1"],
  ["Toh Ming Zhen", "", "Female", "@Tmzzzzz", "Year 2"],
  ["Che Siew Kuan", "", "Female", "@siewkuanc", "Year 2"],
  ["Annice Siaw Zhen Ning", "", "Female", "@anniceeeee", "Year 1"],
  ["Chua Sing Yan, Reiko", "", "Female", "@drinkwaterrn", "Year 2"],
  ["Foo Xin Ning", "", "Female", "xininingg", "Year 1"],
  ["leianne chan", "", "Female", "@leiirr", "Year 1"],
  ["Lin yun hsuan", "", "Female", "@yunnnnn2003", "Exchange student"],
  ["Wan You Ning", "", "Female", "yyouning", "Year 1"],
  ["Nicole Emma Chua En Xin", "", "Female", "@nicchuas", "Year 1"],
  ["fellicia tan mei hui", "", "Female", "@fellysure", "Year 1"],
  ["Goh Jun Tong", "", "Female", "@tongieee", "Year 1"],
  ["Chin Wai Chuan", "", "Male", "@waichuannn", "Year 1"],
  ["Tsai Kai Ming", "", "Male", "kai2m", "Year 1"],
  ["Jireh Ong", "", "Male", "bulkingwcookies", "Year 1"],
  ["Sivansh Nochur", "", "Male", "@sivanshn", "Year 3"],
  ["Shrivastava Soham", "", "Male", "@sohamshrivastava", "Year 1"],
  ["Ralph Casper Tan", "", "Male", "ralphcaspertan", "Year 1"],
  ["Parthiban Siddharthan", "", "Male", "@MiloKami", "Year 1"],
  ["Ferrois Thiam Yi Ze", "", "Male", "ferroisss", "Year 1"],
  ["Ernest Harold Yeo", "", "Male", "@ern3sty", "Year 1"],
  ["Luo HaoHang", "", "Male", "@Haydluo1018", "Year 1"],
  ["Poorvek Reddy Devireddy", "", "Male", "@Poorvek", "Year 2"],
  ["Shounak Mirji Dhananjay", "", "Male", "@miirji", "Year 2"],
  ["Agil Singaraselvan", "", "Male", "@gillsgowhere", "Year 2"],
  ["Axel", "", "Male", "", ""],
  ["Larry", "", "Male", "@hilarryousss", "Year 3"],
  ["Seam Shaurya", "Male Captain", "Male", "@shaurya_seam", "Year 2"],
  ["Yap Ting", "Female Captain", "Female", "@limre_lam", "Year 2"],
  ["Atharv Arora", "Male Vice-Captain", "Male", "@atharv_arora", "Year 1"],
  ["Hoh Ying Min", "Female Vice-Captain", "Female", "ymhoh", "Year 1"],
];

function blankParticulars() {
  return {
    gender: "",
    yearOfStudy: "",
    telegram: "",
    roomNo: "",
    nusnetId: "",
    nusEmail: "",
    phone: "",
    shirtSize: "",
    dietary: "",
  };
}

function seedMembers() {
  return SEED_ROWS.map(([name, tag, gender, telegram, yearOfStudy], i) => ({
    id: `seed-${i}`,
    name,
    tag,
    ...blankParticulars(),
    gender,
    telegram,
    yearOfStudy,
  }));
}

// ---------------- storage (Supabase) ----------------
import { supabase } from "./supabaseClient";

const ROW_ID = "main";

async function loadData() {
  try {
    const { data, error } = await supabase
      .from("app_state")
      .select("data")
      .eq("id", ROW_ID)
      .single();
    if (!error && data && data.data) return data.data;
  } catch (e) {
    console.error("load failed", e);
  }
  return { members: seedMembers(), attendance: {} };
}

async function saveData(data) {
  try {
    const { error } = await supabase
      .from("app_state")
      .upsert({ id: ROW_ID, data });
    if (error) console.error("save failed", error);
  } catch (e) {
    console.error("save failed", e);
  }
}

// ---------------- palette ----------------
const GREEN = "#0F3D2E";
const GREEN_SOFT = "#e8f2ec";
const RED = "#B23A2E";
const GOLD = "#C9A24B";
const CREAM = "#fdfdfb";
const CARD = "#f7f7f5";
const LINE = "#e5e5e0";
const MALE_COLOR = "#3E6C9E";
const FEMALE_COLOR = "#B15C8C";

const TAG_COLOR = {
  "Male Captain": GOLD,
  "Female Captain": GOLD,
  "Male Vice-Captain": "#8a8a5e",
  "Female Vice-Captain": "#8a8a5e",
};

const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const YEAR_OPTIONS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Exchange student"];

function genderBadge(gender) {
  if (!gender) return null;
  const isMale = gender === "Male";
  return (
    <span
      className="text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
      style={{ backgroundColor: isMale ? MALE_COLOR : FEMALE_COLOR }}
      title={gender}
    >
      {gender[0]}
    </span>
  );
}

// ---------------- hooks ----------------
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf;
    let start = null;
    function step(ts) {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

// ---------------- shared bits ----------------
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium rounded-full transition-colors"
      style={{
        backgroundColor: active ? GREEN : "transparent",
        color: active ? CREAM : "#4b5563",
        border: active ? "none" : `1px solid #d1d5db`,
      }}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, suffix = "", decimals = 0, color = GREEN }) {
  const animated = useCountUp(value);
  return (
    <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>
        {animated.toFixed(decimals)}
        {suffix}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

// ---------------- Log view ----------------
function LogView({ members, attendance, setAttendance }) {
  const sorted = useMemo(() => [...members].sort((a, b) => a.name.localeCompare(b.name)), [members]);
  const [idx, setIdx] = useState(() => {
    const i = VALID_DATES.indexOf(TODAY_KEY);
    return i >= 0 ? i : Math.max(0, VALID_DATES.findIndex((d) => d >= TODAY_KEY));
  });
  const dateKey = VALID_DATES[idx];
  const present = new Set(attendance[dateKey] || []);

  const toggle = (id) => {
    const next = new Set(attendance[dateKey] || []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setAttendance({ ...attendance, [dateKey]: [...next] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg disabled:opacity-30"
          style={{ backgroundColor: "#eee" }}
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-lg font-semibold" style={{ color: GREEN }}>
            {formatLong(fromKey(dateKey))}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {present.size} / {members.length} present
          </div>
        </div>
        <button
          onClick={() => setIdx((i) => Math.min(VALID_DATES.length - 1, i + 1))}
          disabled={idx === VALID_DATES.length - 1}
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg disabled:opacity-30"
          style={{ backgroundColor: "#eee" }}
        >
          ›
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-10">No members yet. Add them in the Members tab.</div>
      ) : (
        <div className="space-y-2">
          {sorted.map((m) => {
            const isPresent = present.has(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
                style={{
                  backgroundColor: isPresent ? GREEN_SOFT : CARD,
                  border: isPresent ? `1px solid ${GREEN}` : `1px solid ${LINE}`,
                }}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-gray-800 min-w-0">
                  {genderBadge(m.gender)}
                  <span className="truncate">{m.name}</span>
                  {m.tag && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: TAG_COLOR[m.tag] }}>
                      {m.tag.includes("Vice") ? "VC" : "C"}
                    </span>
                  )}
                </span>
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
                  style={{ backgroundColor: isPresent ? GREEN : "#d9d9d3", color: isPresent ? CREAM : "#8a8a80" }}
                >
                  {isPresent ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="text-center text-xs text-gray-400 mt-6">Saves automatically</div>
    </div>
  );
}

// ---------------- Member detail sheet ----------------
function MemberDetailSheet({ member, attendance, sessionsHeld, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const present = PAST_DATES.filter((d) => (attendance[d] || []).includes(member.id)).length;
  const rate = sessionsHeld > 0 ? Math.round((present / sessionsHeld) * 100) : 0;

  const presentDates = PAST_DATES.filter((d) => (attendance[d] || []).includes(member.id));
  let longestStreak = 0;
  let current = 0;
  for (const d of PAST_DATES) {
    if ((attendance[d] || []).includes(member.id)) {
      current += 1;
      longestStreak = Math.max(longestStreak, current);
    } else {
      current = 0;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 transition-opacity"
        style={{ backgroundColor: "rgba(15,61,46,0.35)", opacity: visible ? 1 : 0 }}
        onClick={close}
      />
      <div
        className="relative w-full max-w-md rounded-t-3xl px-5 pt-5 pb-8 transition-transform"
        style={{
          backgroundColor: CREAM,
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transitionDuration: "220ms",
          maxHeight: "82vh",
          overflowY: "auto",
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 min-w-0">
              {genderBadge(member.gender)}
              <div className="text-lg font-bold" style={{ color: GREEN }}>{member.name}</div>
            </div>
            {member.tag && (
              <div className="text-xs font-medium mt-1" style={{ color: TAG_COLOR[member.tag] }}>{member.tag}</div>
            )}
            {member.yearOfStudy && <div className="text-xs text-gray-400 mt-0.5">{member.yearOfStudy}</div>}
          </div>
          <button onClick={close} className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0" style={{ backgroundColor: "#eee", color: "#555" }}>
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="rounded-xl px-3 py-2 text-center" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <div className="text-lg font-bold tabular-nums" style={{ color: GREEN }}>{rate}%</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Attendance</div>
          </div>
          <div className="rounded-xl px-3 py-2 text-center" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <div className="text-lg font-bold tabular-nums" style={{ color: GREEN }}>{present}/{sessionsHeld}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Sessions</div>
          </div>
          <div className="rounded-xl px-3 py-2 text-center" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <div className="text-lg font-bold tabular-nums" style={{ color: GREEN }}>{longestStreak}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Best streak</div>
          </div>
        </div>

        <div className="text-xs font-semibold text-gray-500 mb-2 px-1">Attendance log</div>
        <div className="grid grid-cols-4 gap-2 mb-1 px-1">
          <div className="text-[10px] font-medium text-gray-400">Week of</div>
          <div className="text-[10px] font-medium text-gray-400 text-center">Mon</div>
          <div className="text-[10px] font-medium text-gray-400 text-center">Tue</div>
          <div className="text-[10px] font-medium text-gray-400 text-center">Thu</div>
        </div>
        <div className="space-y-1.5">
          {WEEKS.map(([weekStart, days]) => (
            <div key={weekStart} className="grid grid-cols-4 gap-2 items-center px-1 py-1.5 rounded-lg" style={{ backgroundColor: CARD }}>
              <div className="text-xs text-gray-500">{formatShort(fromKey(weekStart))}</div>
              {["Mon", "Tue", "Thu"].map((label) => {
                const dk = days[label];
                if (!dk) return <div key={label} className="text-center text-gray-300 text-xs">—</div>;
                const isFuture = dk > TODAY_KEY;
                const isPresent = (attendance[dk] || []).includes(member.id);
                return (
                  <div key={label} className="flex justify-center">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{
                        backgroundColor: isFuture ? "#eee" : isPresent ? GREEN_SOFT : "#f7e9e7",
                        color: isFuture ? "#bbb" : isPresent ? GREEN : RED,
                        border: isFuture ? "1px solid #e0e0e0" : isPresent ? `1px solid ${GREEN}` : `1px solid ${RED}`,
                      }}
                    >
                      {isFuture ? "" : isPresent ? "✓" : "✕"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Dashboard view ----------------
function DashboardView({ members, attendance }) {
  const [mounted, setMounted] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const sessionsHeld = PAST_DATES.length;

  const memberStats = useMemo(() => {
    return members
      .map((m) => {
        const present = PAST_DATES.filter((d) => (attendance[d] || []).includes(m.id)).length;
        const rate = sessionsHeld > 0 ? present / sessionsHeld : 0;
        return { ...m, present, rate };
      })
      .sort((a, b) => b.rate - a.rate || b.present - a.present);
  }, [members, attendance, sessionsHeld]);

  const overallRate = useMemo(() => {
    if (members.length === 0 || sessionsHeld === 0) return 0;
    const totalPresent = memberStats.reduce((s, m) => s + m.present, 0);
    return (totalPresent / (members.length * sessionsHeld)) * 100;
  }, [memberStats, members.length, sessionsHeld]);

  const dayStats = useMemo(() => {
    const byDay = { Mon: { present: 0, total: 0 }, Tue: { present: 0, total: 0 }, Thu: { present: 0, total: 0 } };
    for (const dk of PAST_DATES) {
      const dow = fromKey(dk).getDay();
      const label = dow === 1 ? "Mon" : dow === 2 ? "Tue" : "Thu";
      byDay[label].total += members.length;
      byDay[label].present += (attendance[dk] || []).length;
    }
    return ["Mon", "Tue", "Thu"].map((label) => ({
      day: label,
      rate: byDay[label].total > 0 ? Math.round((byDay[label].present / byDay[label].total) * 100) : 0,
    }));
  }, [members.length, attendance]);

  const bestDay = useMemo(() => {
    if (dayStats.every((d) => d.rate === 0)) return "—";
    return dayStats.reduce((a, b) => (b.rate > a.rate ? b : a)).day;
  }, [dayStats]);

  const weeklyTrend = useMemo(() => {
    return WEEKS.map(([weekStart, days]) => {
      const dks = Object.values(days).filter((d) => d <= TODAY_KEY);
      if (dks.length === 0) return null;
      const totalPresent = dks.reduce((s, dk) => s + (attendance[dk] || []).length, 0);
      const rate = members.length > 0 ? (totalPresent / (members.length * dks.length)) * 100 : 0;
      return { week: formatShort(fromKey(weekStart)), rate: Math.round(rate) };
    }).filter(Boolean);
  }, [members.length, attendance]);

  const genderStats = useMemo(() => {
    const groups = { Male: { count: 0, present: 0 }, Female: { count: 0, present: 0 } };
    memberStats.forEach((m) => {
      if (m.gender !== "Male" && m.gender !== "Female") return;
      groups[m.gender].count += 1;
      groups[m.gender].present += m.present;
    });
    const chartData = ["Male", "Female"].map((g) => ({
      gender: g,
      rate: groups[g].count > 0 && sessionsHeld > 0 ? Math.round((groups[g].present / (groups[g].count * sessionsHeld)) * 100) : 0,
    }));
    return { groups, chartData };
  }, [memberStats, sessionsHeld]);

  const captains = memberStats.filter((m) => m.tag);
  const top3 = memberStats.slice(0, 3);
  const rest = memberStats.slice(3);
  const rankColor = (i) => (i === 0 ? GOLD : i === 1 ? "#9CA3AF" : i === 2 ? "#B08D57" : "#d1d5db");

  return (
    <div>
      {/* headline stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="Members" value={members.length} />
        <StatCard label="Sessions logged" value={sessionsHeld} />
        <StatCard label="Overall attendance" value={overallRate} suffix="%" decimals={0} />
        <div className="rounded-2xl px-4 py-3 flex flex-col justify-center" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
          <div className="text-2xl font-bold" style={{ color: GREEN }}>{bestDay}</div>
          <div className="text-xs text-gray-500 mt-0.5">Best-attended day</div>
        </div>
      </div>

      {/* weekly trend */}
      {weeklyTrend.length > 1 && (
        <div className="rounded-2xl px-3 pt-4 pb-2 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
          <div className="text-xs font-semibold text-gray-500 mb-1 px-1">Weekly attendance rate</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={weeklyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#e5e5e0" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip formatter={(v) => [`${v}%`, "Attendance"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${LINE}` }} />
              <Line type="monotone" dataKey="rate" stroke={GREEN} strokeWidth={2.5} dot={{ r: 3, fill: GREEN }} animationDuration={900} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* day of week comparison */}
      <div className="rounded-2xl px-3 pt-4 pb-2 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
        <div className="text-xs font-semibold text-gray-500 mb-1 px-1">Attendance by training day</div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={dayStats} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#e5e5e0" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip formatter={(v) => [`${v}%`, "Attendance"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${LINE}` }} />
            <Bar dataKey="rate" fill={GREEN} radius={[6, 6, 0, 0]} animationDuration={900} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* gender split */}
      <div className="rounded-2xl px-3 pt-4 pb-3 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
        <div className="text-xs font-semibold text-gray-500 mb-2 px-1">Gender split</div>
        <div className="grid grid-cols-2 gap-3 mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: MALE_COLOR }} />
            <div>
              <div className="text-lg font-bold tabular-nums" style={{ color: MALE_COLOR }}>{genderStats.groups.Male.count}</div>
              <div className="text-[11px] text-gray-500">Male</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: FEMALE_COLOR }} />
            <div>
              <div className="text-lg font-bold tabular-nums" style={{ color: FEMALE_COLOR }}>{genderStats.groups.Female.count}</div>
              <div className="text-[11px] text-gray-500">Female</div>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={90}>
          <BarChart data={genderStats.chartData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey="gender" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={50} />
            <Tooltip formatter={(v) => [`${v}%`, "Attendance"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${LINE}` }} />
            <Bar dataKey="rate" radius={[0, 6, 6, 0]} animationDuration={900}>
              {genderStats.chartData.map((entry, i) => (
                <Cell key={i} fill={entry.gender === "Male" ? MALE_COLOR : FEMALE_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* captains */}
      {captains.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 mb-2 px-1">Leadership</div>
          <div className="grid grid-cols-2 gap-2">
            {captains.map((c) => (
              <div key={c.id} className="rounded-xl px-3 py-2" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
                <div className="flex items-center gap-1.5 min-w-0">
                  {genderBadge(c.gender)}
                  <div className="text-sm font-semibold text-gray-800 truncate">{c.name}</div>
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: TAG_COLOR[c.tag] }}>{c.tag}</div>
                <div className="text-xs text-gray-500 mt-1">{Math.round(c.rate * 100)}% attendance</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* leaderboard */}
      <div>
        <div className="text-xs font-semibold text-gray-500 mb-2 px-1">Attendance leaderboard</div>
        <div className="space-y-1.5">
          {top3.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
              style={{
                backgroundColor: CARD,
                border: `1px solid ${LINE}`,
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(8px)",
                transitionDelay: `${i * 60}ms`,
              }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: rankColor(i), color: "#fff" }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {genderBadge(m.gender)}
                  <div className="text-sm font-medium text-gray-800 truncate">{m.name}</div>
                </div>
                <div className="h-1.5 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: "#eee" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: mounted ? `${m.rate * 100}%` : "0%", backgroundColor: GREEN, transitionDuration: "800ms", transitionDelay: `${i * 60}ms` }}
                  />
                </div>
              </div>
              <div className="text-xs font-semibold text-gray-500 shrink-0">{Math.round(m.rate * 100)}%</div>
              <span className="text-gray-300 text-xs shrink-0">›</span>
            </button>
          ))}
          {rest.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left"
              style={{
                backgroundColor: "transparent",
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(8px)",
                transitionDelay: `${Math.min((i + 3) * 30, 600)}ms`,
              }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-gray-400 shrink-0">{i + 4}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {genderBadge(m.gender)}
                  <div className="text-sm text-gray-700 truncate">{m.name}</div>
                </div>
                <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: "#eee" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: mounted ? `${m.rate * 100}%` : "0%", backgroundColor: "#b9b9ae", transitionDuration: "800ms", transitionDelay: `${Math.min((i + 3) * 30, 600)}ms` }}
                  />
                </div>
              </div>
              <div className="text-xs text-gray-400 shrink-0">{Math.round(m.rate * 100)}%</div>
              <span className="text-gray-300 text-xs shrink-0">›</span>
            </button>
          ))}
        </div>
      </div>

      {selectedId && (
        <MemberDetailSheet
          member={memberStats.find((m) => m.id === selectedId)}
          attendance={attendance}
          sessionsHeld={sessionsHeld}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

// ---------------- Members view ----------------
const FIELD_DEFS = [
  { key: "gender", label: "Gender" },
  { key: "yearOfStudy", label: "Year of Study" },
  { key: "telegram", label: "Telegram Handle" },
  { key: "roomNo", label: "Room No." },
  { key: "nusnetId", label: "NUSNET ID" },
  { key: "nusEmail", label: "NUS Email" },
  { key: "phone", label: "Phone Number" },
  { key: "shirtSize", label: "Shirt Size" },
  { key: "dietary", label: "Dietary Restrictions" },
];

function ParticularsGrid({ member, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-3">
      {FIELD_DEFS.map((f) => {
        const wide = f.key === "nusEmail" || f.key === "dietary";
        return (
          <div key={f.key} className={wide ? "col-span-2" : ""}>
            <div className="text-[10px] font-semibold text-gray-400 mb-1">{f.label}</div>
            {f.key === "shirtSize" ? (
              <select value={member.shirtSize} onChange={(e) => onChange(f.key, e.target.value)} className="w-full px-2 py-1.5 rounded-lg text-xs outline-none bg-white" style={{ border: `1px solid ${LINE}` }}>
                <option value="">—</option>
                {SHIRT_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : f.key === "gender" ? (
              <select value={member.gender} onChange={(e) => onChange(f.key, e.target.value)} className="w-full px-2 py-1.5 rounded-lg text-xs outline-none bg-white" style={{ border: `1px solid ${LINE}` }}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            ) : f.key === "yearOfStudy" ? (
              <select value={member.yearOfStudy} onChange={(e) => onChange(f.key, e.target.value)} className="w-full px-2 py-1.5 rounded-lg text-xs outline-none bg-white" style={{ border: `1px solid ${LINE}` }}>
                <option value="">—</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            ) : (
              <input value={member[f.key]} onChange={(e) => onChange(f.key, e.target.value)} placeholder="—" className="w-full px-2 py-1.5 rounded-lg text-xs outline-none bg-white" style={{ border: `1px solid ${LINE}` }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MembersView({ members, setMembers }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", tag: "", ...blankParticulars() });
  const [filterGender, setFilterGender] = useState("All");
  const [filterYear, setFilterYear] = useState("All");
  const [filterTag, setFilterTag] = useState("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = members;
    if (q) list = list.filter((m) => m.name.toLowerCase().includes(q));
    if (filterGender !== "All") list = list.filter((m) => m.gender === filterGender);
    if (filterYear !== "All") list = list.filter((m) => m.yearOfStudy === filterYear);
    if (filterTag === "Leadership") list = list.filter((m) => m.tag);
    if (filterTag === "Member") list = list.filter((m) => !m.tag);
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [members, query, filterGender, filterYear, filterTag]);

  const updateMember = (id, key, value) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, [key]: value } : m)));
  };
  const removeMember = (id) => {
    setMembers(members.filter((m) => m.id !== id));
    if (openId === id) setOpenId(null);
  };
  const addMember = () => {
    const name = draft.name.trim();
    if (!name) return;
    setMembers([...members, { id: `m-${Date.now()}`, ...draft, name }]);
    setDraft({ name: "", tag: "", ...blankParticulars() });
    setAdding(false);
  };

  const selectClass = "px-2 py-1.5 rounded-full text-xs outline-none bg-white";
  const selectStyle = { border: `1px solid ${LINE}` };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search members" className="flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={{ border: `1px solid #d1d5db` }} />
        <button onClick={() => setAdding((a) => !a)} className="px-4 py-2 rounded-lg text-sm font-medium shrink-0" style={{ backgroundColor: adding ? "#eee" : GREEN, color: adding ? "#333" : CREAM }}>
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className={selectClass} style={selectStyle}>
          <option value="All">All genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={selectClass} style={selectStyle}>
          <option value="All">All years</option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className={selectClass} style={selectStyle}>
          <option value="All">All roles</option>
          <option value="Leadership">Leadership</option>
          <option value="Member">Member</option>
        </select>
      </div>

      {adding && (
        <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
          <div className="text-[10px] font-semibold text-gray-400 mb-1">Name</div>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" className="w-full px-2 py-1.5 rounded-lg text-sm outline-none bg-white mb-2" style={{ border: `1px solid ${LINE}` }} />
          <div className="text-[10px] font-semibold text-gray-400 mb-1">Tag</div>
          <select value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} className="w-full px-2 py-1.5 rounded-lg text-sm outline-none bg-white mb-1" style={{ border: `1px solid ${LINE}` }}>
            <option value="">None</option>
            <option value="Male Captain">Male Captain</option>
            <option value="Female Captain">Female Captain</option>
            <option value="Male Vice-Captain">Male Vice-Captain</option>
            <option value="Female Vice-Captain">Female Vice-Captain</option>
          </select>
          <ParticularsGrid member={draft} onChange={(k, v) => setDraft({ ...draft, [k]: v })} />
          <button onClick={addMember} className="w-full mt-3 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: GREEN, color: CREAM }}>
            Save member
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-10">No members match.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const isOpen = openId === m.id;
            return (
              <div key={m.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
                <button onClick={() => setOpenId(isOpen ? null : m.id)} className="w-full flex items-center justify-between px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-800 min-w-0">
                    {genderBadge(m.gender)}
                    <span className="truncate">{m.name}</span>
                    {m.tag && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: TAG_COLOR[m.tag] }}>
                        {m.tag}
                      </span>
                    )}
                  </span>
                  <span className="text-gray-400 text-xs transition-transform shrink-0" style={{ transform: isOpen ? "rotate(180deg)" : "none" }}>▾</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <ParticularsGrid member={m} onChange={(k, v) => updateMember(m.id, k, v)} />
                    <button onClick={() => removeMember(m.id)} className="text-xs mt-3 px-2 py-1 rounded-full" style={{ color: RED }}>
                      Remove member
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- App ----------------
export default function App() {
  const [tab, setTab] = useState("log");
  const [members, setMembersState] = useState([]);
  const [attendance, setAttendanceState] = useState({});
  const [loaded, setLoaded] = useState(false);
  const stateRef = useRef({ members: [], attendance: {} });

  useEffect(() => {
    loadData().then((data) => {
      const m = data.members || [];
      const a = data.attendance || {};
      setMembersState(m);
      setAttendanceState(a);
      stateRef.current = { members: m, attendance: a };
      setLoaded(true);
    });
  }, []);

  const setMembers = (next) => {
    setMembersState(next);
    stateRef.current.members = next;
    saveData(stateRef.current);
  };
  const setAttendance = (next) => {
    setAttendanceState(next);
    stateRef.current.attendance = next;
    saveData(stateRef.current);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <div className="text-sm text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM }}>
      <div className="max-w-md mx-auto px-4 pt-6 pb-16">
        <div className="mb-6">
          <div className="text-2xl font-bold tracking-tight" style={{ color: GREEN }}>Squash CCA</div>
          <div className="text-sm font-medium text-gray-500">AY26/27 Sem 1</div>
          <div className="text-xs text-gray-400 mt-1">Mon · Tue · Thu — 1 Sep to 31 Dec 2026</div>
        </div>

        <div className="flex gap-2 mb-6">
          <TabButton active={tab === "log"} onClick={() => setTab("log")}>Log</TabButton>
          <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")}>Dashboard</TabButton>
          <TabButton active={tab === "members"} onClick={() => setTab("members")}>Members</TabButton>
        </div>

        {tab === "log" && <LogView members={members} attendance={attendance} setAttendance={setAttendance} />}
        {tab === "dashboard" && <DashboardView members={members} attendance={attendance} />}
        {tab === "members" && <MembersView members={members} setMembers={setMembers} />}
      </div>
    </div>
  );
}
