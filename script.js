// amounts stored as integer paise to avoid float errors
const form = document.getElementById('expense-form');
const nameInput = document.getElementById('name');
const amountInput = document.getElementById('amount');
const expenseList = document.getElementById('expense-list');
const resultList = document.getElementById('result-list');
const calculateBtn = document.getElementById('calculate-btn');
const clearBtn = document.getElementById('clear-btn');

let expenses = JSON.parse(localStorage.getItem('expenses') || '[]');

function formatCurrency(cents) {
  return '₹' + (cents / 100).toFixed(2);
}

function save() {
  localStorage.setItem('expenses', JSON.stringify(expenses));
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderExpenses() {
  if (expenses.length === 0) {
    expenseList.innerHTML = '<li class="muted">No expenses yet.</li>';
    return;
  }
  expenseList.innerHTML = expenses
    .map(
      (e, i) =>
        `<li>${escapeHtml(e.name)} paid ${formatCurrency(e.amount)}
         <button class="del" data-i="${i}" aria-label="delete expense">✕</button>
        </li>`
    )
    .join('');

  document.querySelectorAll('.del').forEach((b) =>
    b.addEventListener('click', (ev) => {
      const idx = Number(ev.currentTarget.dataset.i);
      expenses.splice(idx, 1);
      save();
      renderExpenses();
      resultList.innerHTML = '';
    })
  );
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const amountStr = amountInput.value;
  const amount = Math.round(Number(amountStr) * 100); // convert to paise
  if (!name || isNaN(amount) || amount <= 0) {
    alert('Enter valid name and amount');
    return;
  }
  expenses.push({ name, amount });
  nameInput.value = '';
  amountInput.value = '';
  save();
  renderExpenses();
  resultList.innerHTML = '';
});

function downloadCSV(data, filename = "settlements.csv") {
  const csvRows = data.map(row => row.map(cell => `"${cell}"`).join(","));
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n"); 
  // \uFEFF ensures Excel/Sheets recognize UTF-8 (₹ symbol works)

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

calculateBtn.addEventListener('click', () => {
  if (expenses.length === 0) {
    alert('Add some expenses first');
    return;
  }

  const people = [...new Set(expenses.map((e) => e.name))];
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const share = Math.round(total / people.length);

  const balances = {};
  people.forEach((p) => (balances[p] = 0));
  expenses.forEach((e) => (balances[e.name] += e.amount));
  people.forEach((p) => (balances[p] = balances[p] - share));

  const creditors = [],
    debtors = [];
  for (const p of people) {
    if (balances[p] > 0) creditors.push({ name: p, amount: balances[p] });
    else if (balances[p] < 0) debtors.push({ name: p, amount: -balances[p] });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0,
    j = 0;

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i],
      c = creditors[j];
    const m = Math.min(d.amount, c.amount);

    settlements.push([d.name, `₹${(m / 100).toFixed(2)}`, c.name]);

    d.amount -= m;
    c.amount -= m;

    if (d.amount === 0) i++;
    if (c.amount === 0) j++;
  }

  resultList.innerHTML = settlements.length
    ? settlements.map((s) => `<li>${s[0]} pays ${s[1]} to ${s[2]}</li>`).join('')
    : '<li class="muted">All settled</li>';

  // Add CSV button if settlements exist
  if (settlements.length) {
    const btn = document.createElement("button");
    btn.textContent = "Download CSV";
    btn.onclick = () => downloadCSV([["From", "Amount", "To"], ...settlements]);
    resultList.appendChild(btn);
  }
});

clearBtn.addEventListener('click', () => {
  if (!confirm('Clear all expenses?')) return;
  expenses = [];
  save();
  renderExpenses();
  resultList.innerHTML = '';
});

renderExpenses();
