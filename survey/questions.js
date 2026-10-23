// ===== 設定 =====
// Google Apps Script の「ウェブアプリURL」をここに貼り付けます。
// 空のままだと「お試しモード」（このブラウザの中だけに保存）で動きます。
const GAS_URL = "https://script.google.com/macros/s/AKfycbx7gWIbIgtMeudi9e7GULR42vTdn3FqMvX2KBSt-CK1Nur2xsJQ71MAGrb9QCfk_NZ-/exec";

// 自分のパソコンで試すときだけ「お試しモード」。公開先で未設定なら「準備中」になります。
const IS_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const NOT_READY = !GAS_URL && !IS_LOCAL;

// ===== アンケート内容 =====
const SURVEY = {
  title: "糖活アンケート",
  subtitle: "",
  intro: "",
};

const TRIGGERS = [
  "健康診断の数値が気になった",
  "体重・体型が気になった",
  "疲れやすさ・だるさが気になった",
  "肌や見た目の変化が気になった",
  "家族の健康のため",
  "講座やセミナーに参加して",
  { label: "その他", detail: "具体的に" },
];

// section: 1=全員 / 2=エントリーしている方 / 3=エントリーしていない方 / 4=全員
const QUESTIONS = [
  { id: "q1", no: 1, section: 1, type: "single", required: true,
    text: "糖活プログラムにエントリーしていますか？",
    options: ["エントリーしている", "エントリーしていない"] },

  { id: "q2", no: 2, section: 2, type: "single", required: true,
    text: "エントリーしてどれくらい経ちますか？",
    options: ["1ヶ月未満", "1〜3ヶ月", "3〜6ヶ月", "半年〜1年", "1年以上"] },
  { id: "q3", no: 3, section: 2, type: "multi",
    text: "糖活を始めたきっかけを教えてください。", options: TRIGGERS },
  { id: "q4", no: 4, section: 2, type: "multi", required: true,
    text: "いま取り組んでいることを教えてください。",
    options: [
      "食べる順番を意識している", "糖質の量を意識している", "朝食を意識的に変えている",
      "間食を見直している", "食後に体を動かしている", "睡眠を整えている", "腸活をしている",
      "副腎疲労対策をしている", "肝機能ケアをしている", "エントリーしたけど、まだ何もしていない", { label: "その他", detail: "具体的に" },
    ] },
  { id: "q5", no: 5, section: 2, type: "text",
    text: "続けられている工夫や、うまくいっていることはありますか？" },
  { id: "q6", no: 6, section: 2, type: "text",
    text: "いま悩んでいること・つまずいていることを教えてください。" },
  { id: "q7", no: 7, section: 2, type: "multi", required: true,
    text: "糖活を始めてから起こった変化はありますか？",
    options: [
      "体重・体型が変わった", "食後の眠気が減った", "疲れにくくなった",
      "熟眠感が得られるようになった", "朝起きやすくなった", "肌の調子が変わった",
      "お通じが変わった", "冷え症が改善した", "頭痛が減った", "PMS・月経痛などが改善した",
      "更年期症状がやわらいだ", { label: "数値が改善した", detail: "何の数値か" },
      "気持ちが安定してきた", "食事への意識が変わった", "まだ変化は感じていない",
      { label: "その他", detail: "具体的に" },
    ] },
  { id: "q8", no: 8, section: 2, type: "text",
    text: "これから糖活で叶えたいこと・成し遂げたいことは何ですか？" },

  { id: "q9", no: 9, section: 3, type: "multi",
    text: "糖活に興味を持ったきっかけを教えてください。", options: TRIGGERS },
  { id: "q10", no: 10, section: 3, type: "multi",
    text: "いま気になっている体のことはありますか？",
    options: [
      "食後の眠気", "疲れやすさ", "眠りの浅さ", "朝起きにくい", "肌の調子", "お通じ", "冷え",
      "頭痛", "PMS・月経痛など", "更年期症状", "健康診断の数値", "体重・体型",
      { label: "その他", detail: "具体的に" },
    ] },
  { id: "q11", no: 11, section: 3, type: "text",
    text: "糖活について知りたいこと・不安に思っていることはありますか？" },

  { id: "q12", no: 12, section: 4, type: "text",
    text: "糖活について、いちばん気になっているテーマは何ですか？" },
  { id: "q13", no: 13, section: 4, type: "text",
    text: "ほかの参加者に聞いてみたいことはありますか？" },
  { id: "q14", no: 14, section: 4, type: "text",
    text: "ひとことメッセージをどうぞ。" },
];

const SECTION_NAMES = { 1: "全員", 2: "エントリーしている方", 3: "エントリーしていない方", 4: "全員" };

// ===== 共通ヘルパー =====
function optLabel(o) { return typeof o === "string" ? o : o.label; }
function optDetail(o) { return typeof o === "string" ? null : o.detail; }

const LOCAL_KEY = "toukatsu_survey_answers_v1";

// 回答を送る
async function saveResponse(record) {
  if (!GAS_URL) {
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    list.push(record);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    return;
  }
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(record),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "保存に失敗しました");
}

// 回答一覧を取得
async function loadResponses() {
  if (!GAS_URL) return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  const res = await fetch(GAS_URL + "?t=" + Date.now());
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "読み込みに失敗しました");
  return json.responses;
}

// スプレッドシート用に1行へ整形
function toRow(answers) {
  const headers = ["回答日時", "回答ID"];
  const row = [];
  QUESTIONS.forEach((q) => {
    headers.push("Q" + q.no + " " + q.text);
    const a = answers[q.id];
    if (a == null) { row.push(""); return; }
    if (q.type === "multi") {
      row.push(a.sel.map((s) => (a.notes && a.notes[s] ? s + "（" + a.notes[s] + "）" : s)).join(" / "));
    } else if (q.type === "single") {
      row.push(a);
    } else {
      row.push(a);
    }
  });
  return { headers, row };
}
