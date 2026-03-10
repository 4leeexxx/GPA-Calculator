'use strict';

const GRADE_POINTS = {
  'A+':4.0,'A':4.0,'A-':3.7,
  'B+':3.3,'B':3.0,'B-':2.7,
  'C+':2.3,'C':2.0,'C-':1.7,
  'D+':1.3,'D':1.0,'D-':0.7,
  'F':0.0
};

const RateLimit = (() => {
  const MAX=10,WIN=10000,ts=[];
  return { allow(){ const n=Date.now(); while(ts.length&&n-ts[0]>WIN)ts.shift(); if(ts.length>=MAX)return false; ts.push(n);return true; } };
})();

function safeText(id,v){ const e=document.getElementById(id); if(e)e.textContent=String(v); }
function getEl(id){ return document.getElementById(id); }

let courseCount = 0;

function addCourse(gradePrefill, credits) {
  courseCount++;
  const id = courseCount;
  const row = document.createElement('div');
  row.className = 'course-row';
  row.id = 'course-' + id;
  row.innerHTML = `
    <div class="course-fields">
      <div class="input-group">
        <label>Course Name <span style="font-weight:400;color:var(--text-dim)">(optional)</span></label>
        <div class="input-wrap"><span class="prefix">📘</span><input type="text" class="course-name" placeholder="e.g. Calculus" maxlength="60" autocomplete="off" /></div>
      </div>
      <div class="input-group">
        <label>Grade</label>
        <div class="input-wrap">
          <span class="prefix">🅰</span>
          <select class="course-grade">
            ${Object.keys(GRADE_POINTS).map(g=>`<option value="${g}" ${g===(gradePrefill||'A')?'selected':''}>${g} (${GRADE_POINTS[g].toFixed(1)})</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="input-group">
        <label>Credit Hours</label>
        <div class="input-wrap"><span class="prefix">⏱</span><input type="number" class="course-credits" placeholder="3" min="0.5" max="12" step="0.5" value="${credits||3}" autocomplete="off" /></div>
      </div>
      <button class="remove-btn" type="button" onclick="removeCourse(${id})" aria-label="Remove course">✕</button>
    </div>`;
  getEl('course-list').appendChild(row);
}

function removeCourse(id) {
  const row = getEl('course-' + id);
  if (row) row.remove();
  if (getEl('course-list').children.length === 0) addCourse();
}

function calculateGPA() {
  if (!RateLimit.allow()) return showError('Slow down! Try again in a moment. 😊');

  const rows = document.querySelectorAll('.course-row');
  if (rows.length === 0) return showError('Please add at least one course! 📚');

  let totalCredits = 0, totalPoints = 0, valid = true;

  rows.forEach(row => {
    const gradeEl   = row.querySelector('.course-grade');
    const creditsEl = row.querySelector('.course-credits');
    const grade   = gradeEl ? gradeEl.value : '';
    const credits = parseFloat(creditsEl ? creditsEl.value : '');

    if (!GRADE_POINTS.hasOwnProperty(grade) || isNaN(credits) || credits <= 0 || credits > 12) {
      valid = false; return;
    }
    totalCredits += credits;
    totalPoints  += GRADE_POINTS[grade] * credits;
  });

  if (!valid) return showError('Please check your credit hours — all must be between 0.5 and 12. 🙏');
  if (totalCredits === 0) return showError('Total credits must be greater than zero! 😊');

  const gpa = totalPoints / totalCredits;
  const letter = gpaToLetter(gpa);

  safeText('val-gpa',     gpa.toFixed(2));
  safeText('val-letter',  letter);
  safeText('val-credits', totalCredits.toFixed(1) + ' cr');
  safeText('val-points',  totalPoints.toFixed(2));

  const pct = (gpa / 4.0) * 100;
  const needle = getEl('gpa-needle'), fill = getEl('gpa-fill');
  if (needle) { needle.style.left = pct + '%'; needle.style.borderColor = gpaColor(gpa); }
  if (fill)   { fill.style.width = pct + '%'; fill.style.background = `linear-gradient(90deg,rgba(39,174,96,.1),${gpaColor(gpa)}66)`; }

  const v = getVerdict(gpa);
  safeText('verdict-emoji', v.emoji);
  safeText('verdict-title', v.title);
  safeText('verdict-sub',   v.sub);
  const banner = getEl('verdict-banner');
  if (banner) banner.className = 'verdict-banner ' + v.cls;

  showResults();
}

function gpaColor(g) {
  if (g >= 3.5) return 'var(--green)';
  if (g >= 2.5) return 'var(--gold)';
  return 'var(--red)';
}

function gpaToLetter(g) {
  if (g >= 3.85) return 'A';
  if (g >= 3.5)  return 'A−';
  if (g >= 3.15) return 'B+';
  if (g >= 2.85) return 'B';
  if (g >= 2.5)  return 'B−';
  if (g >= 2.15) return 'C+';
  if (g >= 1.85) return 'C';
  if (g >= 1.5)  return 'C−';
  if (g >= 1.0)  return 'D';
  return 'F';
}

function getVerdict(gpa) {
  if (gpa >= 3.7) return { emoji:'🏆', title:'Dean\'s List material!', sub:`A ${gpa.toFixed(2)} GPA is outstanding. Keep it up!`, cls:'win' };
  if (gpa >= 3.0) return { emoji:'😊', title:'Solid GPA!', sub:`${gpa.toFixed(2)} is a strong grade point average.`, cls:'win' };
  if (gpa >= 2.0) return { emoji:'📚', title:'Room to grow!', sub:`${gpa.toFixed(2)} GPA — a little more effort and you'll be there.`, cls:'info' };
  return { emoji:'💪', title:'Time to study!', sub:`${gpa.toFixed(2)} — don't give up! Every semester is a fresh start.`, cls:'loss' };
}

function showError(msg) {
  safeText('verdict-emoji','⚠️'); safeText('verdict-title','Oops!'); safeText('verdict-sub', msg);
  const b = getEl('verdict-banner'); if(b) b.className='verdict-banner loss';
  safeText('val-gpa','—');safeText('val-letter','—');safeText('val-credits','—');safeText('val-points','—');
  showResults();
  const card=document.querySelector('.calc-card'); if(card){card.style.animation='none';void card.offsetWidth;card.style.animation='shake .4s ease';}
}

function showResults() {
  const p=getEl('results'); if(p){p.style.display='block';p.style.animation='none';void p.offsetWidth;p.style.animation='pop-in .45s cubic-bezier(.22,1,.36,1)';}
  const r=getEl('resetBtn'); if(r) r.style.display='block';
}

function resetGPA() {
  getEl('course-list').innerHTML = '';
  courseCount = 0;
  addCourse(); addCourse();
  const p=getEl('results'); if(p) p.style.display='none';
  const r=getEl('resetBtn'); if(r) r.style.display='none';
}

// Styles for course rows
const st = document.createElement('style');
st.textContent = `
.course-row { margin-bottom:16px; }
.course-fields { display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end; }
.remove-btn { width:42px;height:48px;background:var(--red-light);border:1.5px solid #f5bfba;border-radius:var(--radius-sm);color:var(--red);font-size:16px;cursor:pointer;transition:all .2s;flex-shrink:0; }
.remove-btn:hover { background:var(--red);color:white; }
.add-course-btn { width:100%;padding:12px;background:var(--gold-light);border:1.5px dashed var(--gold);border-radius:var(--radius-sm);color:var(--gold-dark);font-family:var(--font-main);font-size:14px;font-weight:800;cursor:pointer;transition:all .2s; }
.add-course-btn:hover { background:var(--gold);color:white; }
@media(max-width:580px){ .course-fields{grid-template-columns:1fr 1fr;} .course-fields .input-group:first-child{grid-column:1/-1;} }
@keyframes shake{0%{transform:translateX(0)}18%{transform:translateX(-7px)}36%{transform:translateX(7px)}54%{transform:translateX(-4px)}72%{transform:translateX(4px)}100%{transform:translateX(0)}}
@keyframes pop-in{from{opacity:0;transform:scale(.96)translateY(10px)}to{opacity:1;transform:scale(1)translateY(0)}}
`;
document.head.appendChild(st);

document.addEventListener('DOMContentLoaded', () => {
  addCourse('A', 3); addCourse('B+', 3);
  const p=getEl('results'); if(p) p.style.display='none';
  const r=getEl('resetBtn'); if(r) r.style.display='none';
  getEl('addCourseBtn').addEventListener('click', () => addCourse());
});
