import { insightRecords, insightStats, insightPeriod, insightFilter, insightGroups, insightKeys, insightPriorities, insightConditionLabel, insightTrend, insightKeyComparison, insightEfficiency, insightEligible, insightStratum, insightSetupId } from './insights.js';
import { exerciseNames, modeForExercise } from './exercise-names.js';
import { insightConfusions, insightHeatmap, insightConfusionMatrix, insightPracticeSummary } from './insights.js';
function recordedSources(records) { return [...new Map(records.filter(r => r.sourceKnown).map(r => [r.a.exercise + '|' + insightSetupId(r), r])).values()]; }
function sourceOptionLabel(r, i) { const c = r.source, levels = 'mode' in c ? c.levels : c.voiceLevels ?? [1, 1, 1, 1, 1]; return `${i + 1}. ${exerciseNames[r.a.exercise]} · ${insightConditionLabel(r)} · Volume ${Math.round(c.volume * 100)}% · Voices ${levels.map(v => Math.round(v * 100) + '%').join(', ')}`; }
function practiceSummarySection(records, onSetup) {
    const report = insightPracticeSummary(records), section = el('section', '', 'insight-practice-summary');
    section.append(el('h2', 'Your practice focus'));
    if (report.message)
        section.append(el('p', report.message));
    const names = { '1': 'root', 'b2': 'flat second', '2': 'second', 'b3': 'minor third', '3': 'third', '4': 'fourth', '#4': 'sharp fourth', 'b5': 'flat fifth', '5': 'fifth', '#5': 'sharp fifth', 'b6': 'flat sixth', '6': 'sixth', 'bb7': 'diminished seventh', 'b7': 'minor seventh', 'maj7': 'major seventh', 'b9': 'flat ninth', '9': 'ninth', '#9': 'sharp ninth', '11': 'eleventh', '#11': 'sharp eleventh', 'b13': 'flat thirteenth', '13': 'thirteenth' };
    const degreeName = (degree) => names[degree] ?? degree;
    const musicalName = (quality, degree) => `${quality === '7' ? 'dominant-7' : quality === 'm7' ? 'minor-7' : quality} ${degreeName(degree)}`;
    const narrative = el('div', '', 'summary-narrative');
    const strength = report.findings.find(f => f.kind === 'strength'), attention = report.findings.find(f => f.kind === 'attention'), confusion = report.findings.find(f => f.kind === 'confusion');
    if (strength)
        narrative.append(el('p', `Strong recorded results in ${strength.quality} ${degreeName(strength.degree)}s.`));
    const priorities = [attention, confusion].filter((f) => !!f);
    if (priorities.length)
        narrative.append(el('p', 'Look closer at ' + priorities.map(f => `${musicalName(f.quality, f.degree)}s (${f.m.correct}/${f.m.n})`).join(' and ') + '.'));
    if (confusion) {
        const reported = confusion.label.split(' → ')[1];
        const name = musicalName(confusion.quality, confusion.degree);
        narrative.append(el('p', `${name[0].toUpperCase() + name.slice(1)} → ${degreeName(reported)} appears in ${confusion.items.length} recorded errors.`));
    }
    if (narrative.children.length)
        section.append(narrative);
    const actions = el('div', '', 'summary-actions'), allEvidence = details('View evidence');
    allEvidence.classList.add('summary-evidence');
    allEvidence.append(el('p', 'Recorded results across the current scope; practice settings may differ.'));
    if (records.some(r => r.a.gradingSource === 'self'))
        allEvidence.append(el('p', 'Self-rated · not pitch-verified'));
    if (view.family === 'Overall')
        allEvidence.append(el('p', 'Mixed practice, including system-graded and self-rated results'));
    const findingEvidence = [];
    for (const finding of report.findings) {
        const item = el('article', '', 'summary-finding');
        item.append(el('p', finding.text, 'summary-text'));
        item.append(el('p', `${finding.m.correct}/${finding.m.n} correct assessed target notes · ${finding.m.assessedQuestions} assessed questions · ${finding.m.assessedSessions} assessed sessions`, 'insight-scope-note'));
        const evidence = details('View evidence: ' + finding.label), stateKey = 'jazzEarLab:v2:summary:' + JSON.stringify([view.family, view.context, view.days, view.key, view.root, view.quality, view.chord, view.degree, view.production, view.condition, view.setup, finding.label]);
        const remember = () => { try {
            sessionStorage.setItem(stateKey, 'open');
            sessionStorage.setItem('jazzEarLab:v2:summaryReturn', stateKey);
        }
        catch { /* Optional return state. */ } };
        evidence.append(el('p', `${finding.items.length} matching ${finding.kind === 'confusion' ? 'first-error' : 'target-note'} records`));
        const list = el('ul');
        for (const r of finding.items) {
            const line = el('li'), link = el('a', 'Open containing session');
            link.href = r.href;
            link.onclick = remember;
            line.append(el('span', `${r.chordLabel} · ${r.degree} · ${r.a.firstCorrect === true ? 'Correct' : r.a.firstCorrect === false ? 'Incorrect' : 'Unassessed'} · ${exerciseNames[r.a.exercise]} · ${r.a.gradingSource === 'self' ? 'Self-rated' : 'System graded'} · Question ${r.questionId} · Record ${r.a.id} `), link);
            list.append(line);
        }
        evidence.append(list);
        const sources = recordedSources(finding.items);
        if (onSetup && sources.length) {
            const label = el('label', 'Practice source'), select = el('select');
            select.setAttribute('aria-label', 'Summary practice source: ' + finding.label);
            sources.forEach((r, i) => { const option = el('option', sourceOptionLabel(r, i)); option.value = String(i); select.append(option); });
            try {
                const saved = sessionStorage.getItem(stateKey + ':source');
                if (saved !== null && sources[Number(saved)])
                    select.value = saved;
            }
            catch { /* Optional source choice. */ }
            select.onchange = () => { try {
                sessionStorage.setItem(stateKey + ':source', select.value);
            }
            catch { /* Optional source choice. */ } };
            label.append(select);
            evidence.append(label, el('p', 'One recorded setup, not every condition in this finding.', 'insight-scope-note'));
            const action = el('button', 'Review practice setup');
            action.type = 'button';
            action.onclick = () => { remember(); onSetup(sources[Number(select.value)], finding.label, { ...(view.key ? { key: view.key } : {}), ...(view.root ? { root: view.root } : {}), ...(view.chord ? { chord: view.chord } : {}), quality: finding.quality, degree: finding.degree }); };
            evidence.append(action);
        }
        try {
            evidence.open = sessionStorage.getItem(stateKey) === 'open';
        }
        catch { /* Optional disclosure state. */ }
        evidence.ontoggle = () => { try {
            sessionStorage.setItem(stateKey, evidence.open ? 'open' : 'closed');
        }
        catch { /* Optional disclosure state. */ } };
        item.append(evidence);
        allEvidence.append(item);
        findingEvidence.push({ finding, detail: evidence });
        try {
            if (sessionStorage.getItem('jazzEarLab:v2:summaryReturn') === stateKey) {
                allEvidence.open = true;
                sessionStorage.removeItem('jazzEarLab:v2:summaryReturn');
                requestAnimationFrame(() => evidence.querySelector('summary')?.focus());
            }
        }
        catch { /* Optional return focus. */ }
    }
    if (report.unknown || report.unspecified)
        allEvidence.append(el('p', `Unknown: ${report.unknown} · Without annotation: ${report.unspecified}`));
    const available = findingEvidence.filter(x => recordedSources(x.finding.items).length);
    if (report.findings.length) {
        actions.append(allEvidence);
        if (onSetup && available.length) {
            const action = el('button', 'Set up practice');
            action.type = 'button';
            action.onclick = () => { const chosen = available.find(x => x.finding.kind === 'confusion') ?? available.find(x => x.finding.kind === 'attention') ?? available[0]; allEvidence.open = true; for (const x of findingEvidence)
                x.detail.open = x === chosen; chosen.detail.querySelector('summary')?.focus(); };
            actions.append(action);
        }
        section.append(actions);
    }
    return section;
}
function performanceSection(records, onSetup) {
    const report = insightHeatmap(records), section = el('section', '', 'insight-performance');
    section.append(el('h2', 'Performance by chord degree'));
    if (!report.cells.length) {
        section.append(el('p', 'No recorded observations in this scope.'));
        return section;
    }
    section.append(el('p', 'Select a cell for counts and evidence.', 'heatmap-instruction'));
    const legend = el('div', '', 'heatmap-legend');
    legend.append(el('span', 'Lower recorded accuracy'));
    for (const band of ['low', 'mid', 'high', 'top']) {
        const swatch = el('span', '', 'heatmap-swatch');
        swatch.dataset.band = band;
        swatch.setAttribute('aria-hidden', 'true');
        legend.append(swatch);
    }
    legend.append(el('span', 'Higher recorded accuracy'), el('span', 'Limited sample', 'limited-legend'));
    const scroll = el('div', '', 'table-scroll');
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', 'Chord degree performance');
    const table = el('table'), head = el('thead'), tr = el('tr');
    table.append(el('caption', 'Chord quality × target degree'));
    const corner = el('th', 'Degree');
    corner.scope = 'col';
    tr.append(corner);
    for (const degree of report.degrees) {
        const th = el('th', degree);
        th.scope = 'col';
        tr.append(th);
    }
    head.append(tr);
    table.append(head);
    const body = el('tbody'), detail = el('section', '', 'heatmap-evidence');
    detail.hidden = true;
    let pending = null;
    const scopeKey = JSON.stringify([view.family, view.context, view.days, view.key, view.root, view.quality, view.chord, view.degree, view.production, view.condition, view.setup]);
    const stateKey = 'jazzEarLab:v2:heatmap:' + scopeKey;
    const rememberReturn = () => { try {
        sessionStorage.setItem(stateKey + ':return', 'yes');
    }
    catch { /* Optional return focus. */ } };
    try {
        pending = sessionStorage.getItem(stateKey);
    }
    catch { /* Optional selection state. */ }
    const qualityOrder = ['m7', '7', 'maj7'];
    for (const quality of [...report.qualities].sort((a, b) => (qualityOrder.includes(a) ? qualityOrder.indexOf(a) : 3) - (qualityOrder.includes(b) ? qualityOrder.indexOf(b) : 3))) {
        const row = el('tr'), th = el('th', quality);
        th.scope = 'row';
        row.append(th);
        for (const degree of report.degrees) {
            const td = el('td'), cell = report.cells.find(c => c.quality === quality && c.degree === degree);
            if (!cell) {
                td.append(el('span', '—'));
                td.setAttribute('aria-label', `${quality}, ${degree}: no observations`);
                row.append(td);
                continue;
            }
            const label = `${quality}: ${degree}`, identity = JSON.stringify([quality, degree]);
            const control = el('button', cell.rate === null ? 'Unassessed' : Math.round(cell.rate * 100) + '%', 'heatmap-cell');
            control.type = 'button';
            const displayedRate = cell.rate === null ? null : Math.round(cell.rate * 100);
            control.dataset.band = displayedRate === null ? 'none' : displayedRate < 90 ? 'low' : displayedRate < 95 ? 'mid' : displayedRate < 99 ? 'high' : 'top';
            control.dataset.status = cell.status;
            control.setAttribute('aria-label', `${label}, ${cell.rate === null ? 'unassessed' : Math.round(cell.rate * 100) + ' percent'}, ${cell.m.correct} of ${cell.m.n} assessed notes, ${cell.m.questions} questions, ${cell.m.sessions} sessions, ${cell.status}`);
            control.setAttribute('aria-pressed', 'false');
            const selectCell = (focus = true) => {
                for (const b of Array.from(table.querySelectorAll('button')))
                    b.setAttribute('aria-pressed', String(b === control));
                control.setAttribute('aria-pressed', 'true');
                try {
                    sessionStorage.setItem(stateKey, identity);
                }
                catch { /* Optional selection state. */ }
                detail.hidden = false;
                detail.replaceChildren();
                const title = el('h3', `${label} · Recorded results`);
                title.tabIndex = -1;
                detail.append(title, el('p', `${cell.m.correct} / ${cell.m.n} assessed notes · ${cell.m.questions} questions · ${cell.m.sessions} sessions · ${cell.m.unassessed} unassessed notes`), el('p', cell.status === 'limited' ? 'Limited sample: not a reliable strength or weakness.' : cell.status === 'unassessed' ? 'No accuracy result yet.' : 'Recorded across the selected practice scope.'));
                const evidence = details('Matching heatmap records');
                for (const r of cell.items) {
                    const line = el('p'), link = el('a', 'Open containing session');
                    link.href = r.href;
                    link.onclick = rememberReturn;
                    line.append(el('span', `${r.chordLabel} · ${r.degree} · ${r.a.firstCorrect === null ? 'Unassessed' : r.a.firstCorrect ? 'Correct' : 'Incorrect'} · ${r.a.gradingSource === 'self' ? 'Self-rated' : 'System graded'} · Question ${r.questionId} · Record ${r.a.id} `), link);
                    evidence.append(line);
                }
                detail.append(evidence);
                const sources = recordedSources(cell.items);
                if (onSetup && sources.length) {
                    const l = el('label', 'Practice source'), s = el('select');
                    s.setAttribute('aria-label', `Practice source for ${label}`);
                    sources.forEach((r, i) => { const o = el('option', sourceOptionLabel(r, i)); o.value = String(i); s.append(o); });
                    const sourceKey = stateKey + ':source:' + identity;
                    try {
                        const saved = sessionStorage.getItem(sourceKey);
                        if (saved !== null && sources[Number(saved)])
                            s.value = saved;
                    }
                    catch { /* Optional source choice. */ }
                    s.onchange = () => { try {
                        sessionStorage.setItem(sourceKey, s.value);
                    }
                    catch { /* Optional source choice. */ } };
                    l.append(s);
                    detail.append(l, el('p', 'One recorded setup, not every condition in this cell.', 'insight-scope-note'));
                    const action = el('button', 'Review practice setup');
                    action.type = 'button';
                    action.onclick = () => { rememberReturn(); onSetup(sources[Number(s.value)], label, { ...(view.key ? { key: view.key } : {}), ...(view.root ? { root: view.root } : {}), ...(view.chord ? { chord: view.chord } : {}), quality, degree }); };
                    detail.append(action);
                }
                const close = el('button', 'Back to heatmap', 'secondary');
                close.type = 'button';
                close.onclick = () => { detail.hidden = true; control.setAttribute('aria-pressed', 'false'); try {
                    sessionStorage.removeItem(stateKey);
                }
                catch { /* Optional selection state. */ } control.focus(); };
                detail.append(close);
                if (focus)
                    title.focus();
            };
            control.onclick = () => selectCell();
            td.append(control);
            row.append(td);
            if (pending === identity) {
                selectCell(false);
                try {
                    if (sessionStorage.getItem(stateKey + ':return')) {
                        sessionStorage.removeItem(stateKey + ':return');
                        requestAnimationFrame(() => control.focus());
                    }
                }
                catch { /* Optional return focus. */ }
            }
        }
        body.append(row);
    }
    table.append(body);
    scroll.append(table);
    section.append(scroll, legend, detail);
    return section;
}
function confusionSection(records, onSetup) {
    const report = insightConfusions(records), section = el('section', '', 'insight-confusions');
    section.append(el('h2', 'Degree confusions'));
    if (!report.groups.length)
        section.append(el('p', 'No specific first-error directions recorded in this scope.'));
    const list = el('div', '', 'confusion-list'), matrix = el('div', '', 'confusion-matrix');
    const rows = new Map();
    const matrixState = 'jazzEarLab:v2:matrix:' + JSON.stringify([view.family, view.context, view.days, view.key, view.root, view.quality, view.chord, view.degree, view.production, view.condition, view.setup]);
    let presentation = 'List', quality = report.groups[0]?.quality ?? '', matrixSelection = '', showAll = false;
    const listHeader = el('div', '', 'confusion-columns');
    listHeader.append(el('span', 'Target → Reported'), el('span', 'Errors'));
    const allButton = el('button', 'All confusions', 'confusion-all');
    allButton.type = 'button';
    const accounting = el('p', '', 'confusion-accounting');
    const listPreferences = new Map();
    try {
        const saved = JSON.parse(sessionStorage.getItem(matrixState) ?? 'null');
        if (saved) {
            presentation = saved.presentation === 'Matrix' ? 'Matrix' : 'List';
            matrixSelection = typeof saved.selection === 'string' ? saved.selection : '';
            showAll = saved.showAll === true;
            if (report.groups.some(g => g.quality === saved.quality))
                quality = saved.quality;
        }
    }
    catch { /* Optional matrix view. */ }
    const controls = el('div', '', 'insight-tabs');
    const modeButtons = new Map();
    const renderMatrix = () => {
        try {
            sessionStorage.setItem(matrixState, JSON.stringify({ presentation, quality, selection: matrixSelection, showAll }));
        }
        catch { /* Optional matrix view. */ }
        let index = 0;
        for (const [key, row] of rows) {
            row.hidden = presentation === 'Matrix' ? key !== matrixSelection : !showAll && index >= 3;
            row.open = presentation === 'List' ? (listPreferences.get(row) ?? false) : key === matrixSelection;
            const link = row.querySelector('.confusion-evidence>summary');
            if (link)
                link.textContent = presentation === 'Matrix' ? 'Evidence' : 'View matching records';
            index++;
        }
        listHeader.hidden = presentation !== 'List';
        allButton.hidden = presentation !== 'List' || report.groups.length <= 3;
        allButton.textContent = showAll ? 'Show fewer' : 'All confusions';
        matrix.hidden = presentation !== 'Matrix';
        for (const [name, b] of modeButtons)
            b.setAttribute('aria-pressed', String(name === presentation));
        section.classList.toggle('is-matrix', presentation === 'Matrix');
        const shownReport = presentation === 'Matrix' ? insightConfusions(records.filter(r => r.quality === quality)) : report;
        accounting.textContent = presentation === 'Matrix' ? `Unknown: ${shownReport.unknown} · Without annotation: ${shownReport.unspecified}` : `Unknown ${report.unknown} · No annotation ${report.unspecified},not included in directions.`;
        matrix.replaceChildren();
        if (matrix.hidden)
            return;
        const label = el('label', 'Quality'), select = el('select');
        select.setAttribute('aria-label', 'Matrix chord quality');
        for (const q of [...new Set(report.groups.map(g => g.quality))]) {
            const option = el('option', q);
            option.value = q;
            select.append(option);
        }
        select.value = quality;
        select.onchange = () => { quality = select.value; matrixSelection = ''; renderMatrix(); matrix.querySelector('select')?.focus(); };
        label.append(select);
        matrix.append(label);
        const projection = insightConfusionMatrix(report, quality), maximum = Math.max(1, ...projection.groups.map(g => g.count));
        const legend = el('div', '', 'matrix-legend');
        legend.append(el('p', `Recorded first errors · 0 to ${maximum}`));
        for (let band = 5; band >= 0; band--) {
            const lo = band === 0 ? 0 : Math.floor((band - 1) * maximum / 5) + 1, hi = Math.floor(band * maximum / 5);
            if (lo > hi)
                continue;
            const item = el('div'), swatch = el('span', '', 'matrix-swatch');
            swatch.dataset.intensity = String(band);
            swatch.setAttribute('aria-hidden', 'true');
            item.append(swatch, el('span', lo === hi ? String(lo) : `${lo} – ${hi}`));
            legend.append(item);
        }
        matrix.append(el('p', 'Reported degree', 'matrix-axis'));
        const scroll = el('div', '', 'table-scroll');
        scroll.tabIndex = 0;
        scroll.setAttribute('role', 'region');
        scroll.setAttribute('aria-label', 'Degree confusion matrix');
        const table = el('table'), head = el('thead'), header = el('tr'), corner = el('th', 'Target degree');
        corner.scope = 'col';
        header.append(corner);
        table.append(el('caption', `${quality} · First-error directions`));
        table.style.setProperty('--matrix-columns', String(projection.degrees.length + 1));
        for (const degree of projection.degrees) {
            const th = el('th', degree);
            th.scope = 'col';
            header.append(th);
        }
        head.append(header);
        table.append(head);
        const body = el('tbody');
        for (const target of projection.degrees) {
            const tr = el('tr'), th = el('th', target);
            th.scope = 'row';
            tr.append(th);
            for (const reported of projection.degrees) {
                const td = el('td'), group = projection.groups.find(g => g.target === target && g.reported === reported);
                if (target === reported) {
                    td.textContent = '—';
                    td.setAttribute('aria-label', 'Not an error direction');
                }
                else if (!group) {
                    td.textContent = '0';
                    td.setAttribute('aria-label', `${quality}: target ${target}, reported ${reported}, 0 recorded errors`);
                }
                else {
                    const button = el('button', String(group.count), 'confusion-cell');
                    button.type = 'button';
                    button.dataset.intensity = String(Math.ceil(group.count / maximum * 5));
                    button.setAttribute('aria-label', `${quality}: target ${target}, reported ${reported}, ${group.count} errors`);
                    button.setAttribute('aria-pressed', String(matrixSelection === JSON.stringify([quality, target, reported])));
                    button.onclick = () => { matrixSelection = JSON.stringify([quality, target, reported]); renderMatrix(); rows.get(matrixSelection)?.querySelector('summary')?.focus(); };
                    td.append(button);
                }
                tr.append(td);
            }
            body.append(tr);
        }
        table.append(body);
        scroll.append(table);
        const plot = el('div', '', 'matrix-plot');
        plot.append(scroll, legend);
        matrix.append(plot, el('p', `Unassessed notes: ${shownReport.unassessed}`, 'matrix-accounting'));
    };
    if (report.groups.length) {
        for (const mode of ['List', 'Matrix']) {
            const b = el('button', mode, 'secondary');
            b.type = 'button';
            b.onclick = () => { presentation = mode; renderMatrix(); };
            modeButtons.set(mode, b);
            controls.append(b);
        }
        section.append(controls, matrix);
    }
    for (const group of report.groups) {
        const label = `${group.quality}: ${group.target} → ${group.reported}`;
        const rememberFocus = () => { try {
            sessionStorage.setItem('jazzEarLab:v2:confusionReturn', label);
        }
        catch { /* Optional return focus. */ } };
        const row = details(''), heading = row.querySelector('summary');
        heading.setAttribute('aria-label', `${label} · ${group.count} errors`);
        heading.onclick = event => { if (presentation !== 'Matrix')
            return; event.preventDefault(); matrixSelection = ''; renderMatrix(); Array.from(matrix.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === `${group.quality}: target ${group.target}, reported ${group.reported}, ${group.count} errors`)?.focus(); };
        heading.append(el('span', `${group.quality} · ${group.target} → ${group.reported}`), el('span', String(group.count), 'confusion-count'));
        const matrixCounts = el('div', '', 'matrix-selection-counts');
        matrixCounts.append(el('p', `${group.count} of ${group.assessed} assessed target notes`), el('p', `${records.filter(r => r.quality === group.quality && r.degree === group.target && r.a.firstCorrect === false).length} first errors in this target group`));
        row.append(matrixCounts);
        const roots = el('ul', '', 'confusion-roots');
        for (const root of group.roots) {
            const li = el('li');
            li.append(el('span', root.label), el('span', String(root.count)));
            li.setAttribute('aria-label', `${root.label}: ${root.count}`);
            roots.append(li);
        }
        row.append(roots);
        const evidence = details('View matching records');
        evidence.classList.add('confusion-evidence');
        evidence.append(el('p', `${group.count} confusions / ${group.assessed} assessed target notes · ${group.questions} questions · ${group.sessions} sessions`));
        for (const r of group.items) {
            const line = el('div'), link = el('a', 'Open containing session');
            link.href = r.href;
            link.onclick = rememberFocus;
            line.append(el('p', `${r.chordLabel} · target ${r.degree} → reported ${group.reported} · ${exerciseNames[r.a.exercise]} · ${r.a.gradingSource === 'self' ? 'Self-rated' : 'System graded'}`), el('p', `${r.time === null ? 'Date not recorded' : new Date(r.time).toLocaleString()} · Question ${r.questionId} · Record ${r.a.id}`, 'insight-scope-note'), link);
            evidence.append(line);
        }
        row.append(evidence);
        const sources = recordedSources(group.items);
        if (onSetup && sources.length) {
            const sourceLabel = el('label', 'Practice source'), select = el('select');
            select.setAttribute('aria-label', `Practice source for ${label}`);
            sources.forEach((r, i) => { const option = el('option', sourceOptionLabel(r, i)); option.value = String(i); select.append(option); });
            sourceLabel.append(select);
            evidence.append(sourceLabel);
            const settings = el('p', '', 'insight-scope-note');
            const describeSource = () => { const c = sources[Number(select.value)].source; settings.textContent = 'Voice levels: ' + ('mode' in c ? c.levels : c.voiceLevels ?? [1, 1, 1, 1, 1]).map(n => Math.round(n * 100) + '%').join(', ') + ' · Volume: ' + Math.round(c.volume * 100) + '%'; };
            const sourceKey = matrixState + ':source:' + label;
            try {
                const saved = sessionStorage.getItem(sourceKey);
                if (saved !== null && sources[Number(saved)])
                    select.value = saved;
            }
            catch { /* Optional source choice. */ }
            select.onchange = () => { describeSource(); try {
                sessionStorage.setItem(sourceKey, select.value);
            }
            catch { /* Optional source choice. */ } };
            describeSource();
            evidence.append(settings);
            evidence.append(el('p', 'This setup is one source of these results.', 'insight-scope-note'));
            const action = el('button', 'Review practice setup');
            action.type = 'button';
            action.setAttribute('aria-label', `Review practice setup for ${label}`);
            action.onclick = () => { rememberFocus(); onSetup(sources[Number(select.value)], label, { ...(view.key ? { key: view.key } : {}), ...(view.root ? { root: view.root } : {}), ...(view.chord ? { chord: view.chord } : {}), quality: group.quality, degree: group.target }); };
            evidence.append(action);
        }
        else
            evidence.append(el('p', 'Original practice setup unavailable; review the records instead.'));
        const stateKey = matrixState + ':row:' + label;
        try {
            row.open = sessionStorage.getItem(stateKey) === 'open' || sessionStorage.getItem(stateKey) === null && rows.size === 0;
        }
        catch { /* Optional disclosure state. */ }
        listPreferences.set(row, row.open);
        row.ontoggle = () => { if (presentation === 'List') {
            listPreferences.set(row, row.open);
            try {
                sessionStorage.setItem(stateKey, row.open ? 'open' : 'closed');
            }
            catch { /* Optional disclosure state. */ }
        } };
        rows.set(JSON.stringify([group.quality, group.target, group.reported]), row);
        list.append(row);
        try {
            if (sessionStorage.getItem('jazzEarLab:v2:confusionReturn') === label) {
                showAll = showAll || rows.size > 3;
                evidence.open = true;
                sessionStorage.removeItem('jazzEarLab:v2:confusionReturn');
                requestAnimationFrame(() => row.querySelector('summary')?.focus());
            }
        }
        catch { /* Optional return focus. */ }
    }
    allButton.onclick = () => { showAll = !showAll; renderMatrix(); };
    section.append(listHeader, list, allButton);
    renderMatrix();
    section.append(accounting);
    return section;
}
const families = ['Degree Recognition', 'Degree Audiation', 'Play by Ear'];
const initial = { family: 'Overall', context: 'Single Chord', days: 28, dimension: 'Key', key: '', root: '', quality: '', chord: '', degree: '', production: 'all', sort: 'Errors', all: false, baseline: '', chordView: 'Chord quality', comparable: false, condition: '', setup: '' };
let view = { ...initial };
let scopeNotice = '';
try {
    const saved = JSON.parse(sessionStorage.getItem('jazzEarLab:v2:insightView') ?? 'null');
    if (saved && ['Overall', ...families].includes(saved.family) && [7, 28, 90, 0].includes(saved.days))
        view = { ...initial, ...saved };
}
catch { /* View preferences never block history. */ }
function el(tag, text = '', cls = '') { const n = document.createElement(tag); n.textContent = text; n.className = cls; return n; }
function details(title, ...nodes) { const n = el('details'); n.append(el('summary', title), ...nodes); return n; }
const percent = (m) => m.n ? Math.round(100 * m.correct / m.n) + '%' : '—';
function musicalOverview(records, onSetup) { const n = el('div', '', 'insight-musical-overview'); n.append(confusionSection(records, onSetup), performanceSection(records, onSetup)); return n; }
export function renderInsights(host, sessions, runs, evidence, onSetup) {
    const all = insightRecords(sessions, runs, evidence);
    function render() {
        const focus = document.activeElement?.dataset.insightControl;
        const open = Array.from(host.querySelectorAll('details[open]')).map(n => n.querySelector('summary')?.textContent);
        const finish = () => { for (const d of Array.from(host.querySelectorAll('details')))
            if (open.includes(d.querySelector('summary')?.textContent))
                d.open = true; if (focus) {
            const restored = Array.from(host.querySelectorAll('[data-insight-control]')).find(n => n.dataset.insightControl === focus);
            const target = restored ?? host.querySelector('.insight-analysis h2') ?? host.querySelector('h2');
            if (target) {
                if (!restored)
                    target.tabIndex = -1;
                target.focus({ preventScroll: true });
            }
        } };
        host.replaceChildren();
        host.classList.add('insights-work');
        try {
            sessionStorage.setItem('jazzEarLab:v2:insightView', JSON.stringify(view));
        }
        catch { /* Nonessential view preference. */ }
        const button = (text, action, selected = false) => { const b = el('button', text, 'secondary'); b.type = 'button'; b.dataset.insightControl = text; b.setAttribute('aria-pressed', String(selected)); b.onclick = () => { action(); render(); }; return b; };
        const select = (name, value, values, change) => { const l = el('label', name), s = el('select'); s.setAttribute('aria-label', name); s.dataset.insightControl = name; for (const v of values) {
            const o = el('option', v);
            o.value = v;
            s.append(o);
        } s.value = value; s.onchange = () => { change(s.value); render(); }; l.append(s); return l; };
        const reset = () => { scopeNotice = ''; view.key = view.root = view.quality = view.chord = view.degree = ''; view.all = false; view.baseline = ''; view.comparable = false; view.condition = view.setup = ''; };
        const changeScope = (family, context = view.context) => {
            if (family === view.family && context === view.context)
                return;
            const cleared = [];
            if (context === 'Single Chord' && view.key) {
                view.key = '';
                cleared.push('playback key (Single Chord uses chord roots)');
            }
            if (view.condition || view.setup) {
                view.condition = view.setup = '';
                cleared.push('exercise-specific practice conditions');
            }
            if ((family !== 'Degree Audiation' || context !== 'Single Chord') && view.production !== 'all') {
                view.production = 'all';
                cleared.push('Audiation production category');
            }
            view.family = family;
            view.context = context;
            view.baseline = '';
            view.comparable = false;
            view.all = false;
            scopeNotice = cleared.length ? 'Cleared incompatible filters: ' + cleared.join('; ') + '. Other musical filters were retained.' : '';
        };
        const bar = el('div', '', 'insight-toolbar');
        bar.append(select('Practice family', view.family, ['Overall', ...families], v => changeScope(v)), select('Period', view.days ? `Last ${view.days} days` : 'All time', ['Last 7 days', 'Last 28 days', 'Last 90 days', 'All time'], v => { view.days = v === 'All time' ? 0 : Number(v.match(/\d+/)[0]); }));
        host.append(bar);
        if (scopeNotice) {
            const notice = el('p', scopeNotice, 'insight-scope-note');
            notice.setAttribute('role', 'status');
            host.append(notice);
        }
        if (view.family !== 'Overall') {
            const contexts = el('div', '', 'insight-contexts');
            for (const c of ['Progression', 'Single Chord'])
                contexts.append(button(c, () => changeScope(view.family, c), view.context === c));
            bar.insertBefore(contexts, bar.lastElementChild);
        }
        const period = insightPeriod(view.days || 28), scope = view.days ? all.filter(r => r.time !== null && r.time >= period.start && r.time < period.end) : all;
        const dateLabel = (n) => new Date(n).toLocaleDateString();
        const dateFacts = el('div');
        dateFacts.append(el('p', (view.days ? `${dateLabel(period.start)} – ${dateLabel(period.end - 1)}` : 'All recorded dates') + ' · Records in this browser'));
        if (all.some(r => r.dateSource === 'session'))
            dateFacts.append(el('p', 'Some older records use session-start dates. Exact question dates were not recorded.'));
        if (all.some(r => r.time === null))
            dateFacts.append(el('p', `${all.filter(r => r.time === null).length} records have no usable date; available in All time.`));
        const currentScope = el('div', '', 'insight-current-scope');
        host.append(currentScope);
        const scopeFilters = Object.entries({ key: view.key, root: view.root, quality: view.quality, chord: view.chord, degree: view.degree }).filter(([, value]) => value);
        if (scopeFilters.length)
            currentScope.append(el('p', 'Filters: ' + scopeFilters.map(([key, value]) => key + ': ' + value + (key === 'key' && view.family === 'Overall' ? ' (progression only)' : '')).join(' · ')));
        const outcome = (records, title, compact = false) => { const m = insightStats(records), block = el('section', '', 'insight-outcome'); block.setAttribute('aria-label', title); if (compact && !m.questions) {
            block.append(el('h2', title), el('p', 'No records in this period', 'insight-scope-note'));
            return block;
        } block.append(el('h2', title), el('p', percent(m), 'metric-number'), el('p', `${m.correct} / ${m.n} assessed`, 'assessment-count'), el('p', `${m.questions} questions · ${m.sessions} sessions · ${m.unassessed} unassessed`, 'insight-scope-note')); if (!compact || m.replayed)
            block.append(el('p', `Replay-assisted first responses: ${m.replayed} / ${m.n}`, 'insight-scope-note')); block.dataset.assessed = String(m.n); block.dataset.correct = String(m.correct); return block; };
        if (view.family === 'Overall') {
            const overviewRows = insightFilter(scope, { root: view.root, quality: view.quality, chord: view.chord, degree: view.degree }).filter(r => !view.key || r.context === 'Single Chord' || r.key === view.key);
            const total = insightStats(overviewRows);
            host.append(el('p', `Mixed practice including self-ratings · ${percent(total)} · ${total.correct}/${total.n} assessed notes · ${total.questions} questions · ${total.sessions} sessions`, 'insight-total-line'));
            host.append(practiceSummarySection(overviewRows, onSetup), musicalOverview(overviewRows, onSetup), el('h2', 'Recent performance'));
            if (scopeFilters.length)
                currentScope.append(button('Clear filters', reset));
            if (!scope.length) {
                host.append(el('p', all.length ? 'No matching records in this period. Try a wider period.' : 'No V2 records in this browser. Choose an exercise to begin.'), button('Show all time', () => { view.days = 0; }));
                const link = el('a', 'Choose an exercise');
                link.href = '#home';
                host.append(link, details('Source conditions', dateFacts));
                finish();
                return;
            }
            for (const family of families) {
                const section = el('section', '', 'insight-family');
                section.append(el('h3', family), el('p', family === 'Degree Recognition' ? 'System graded' : 'Self-rated · not pitch-verified', 'insight-scope-note'));
                const grid = el('div', '', 'insight-family-contexts');
                for (const context of ['Single Chord', 'Progression']) {
                    const records = overviewRows.filter(r => r.family === family && r.context === context), block = outcome(records, context, true);
                    const enter = button('View ' + context + ' · ' + family, () => changeScope(family, context));
                    enter.setAttribute('aria-label', 'View ' + context + ' · ' + family);
                    enter.textContent = 'View ' + context;
                    block.append(enter);
                    grid.append(block);
                }
                section.append(grid);
                host.append(section);
            }
            host.append(details('Combined degree accuracy', outcome(overviewRows, 'Mixed practice including self-ratings'), dateFacts));
        }
        else {
            const mode = Object.entries(exerciseNames).find(([, name]) => name === view.context + ' · ' + view.family)[0];
            const allMode = all.filter(r => r.a.exercise === mode).filter(r => (!view.condition || insightStratum(r) === view.condition) && (!view.setup || insightSetupId(r) === view.setup)).filter(r => mode !== 'm1' || view.production === 'all' || (view.production === 'played' ? r.a.responseMethod === 'played' : ['imagined', 'sung'].includes(r.a.responseMethod)));
            const modeRows = scope.filter(r => allMode.includes(r));
            let rows = insightFilter(modeRows, { key: view.key, root: view.root, quality: view.quality, chord: view.chord, degree: view.degree });
            if (mode === 'm1' && view.production !== 'all')
                rows = rows.filter(r => view.production === 'played' ? r.a.responseMethod === 'played' : ['imagined', 'sung'].includes(r.a.responseMethod));
            const m = insightStats(rows), result = el('section', '', 'insight-outcome insight-compact-outcome');
            result.setAttribute('aria-label', view.family === 'Degree Recognition' ? 'First-answer accuracy' : 'Self-rated accuracy');
            result.dataset.assessed = String(m.n);
            result.dataset.correct = String(m.correct);
            const totals = el('p');
            totals.append(el('strong', percent(m)), document.createTextNode(` · ${m.correct} / ${m.n} assessed notes · `), el('span', `${m.questions} questions · ${m.sessions} sessions`, 'insight-counts'));
            result.append(totals, el('span', view.family === 'Degree Recognition' ? 'System graded' : 'Self-rated', 'insight-assessment'));
            host.append(result);
            dateFacts.append(el('p', `${m.unassessed} unassessed · Replay-assisted first responses: ${m.replayed} / ${m.n}`));
            host.append(practiceSummarySection(rows, onSetup));
            if (!modeRows.length || !rows.length) {
                host.append(details('Source conditions', dateFacts));
                host.append(el('p', Object.entries({ key: view.key, root: view.root, quality: view.quality, chord: view.chord, degree: view.degree }).filter(([, value]) => value).map(([key, value]) => key + ': ' + value).join(' · '), 'insight-scope-note'));
                host.append(el('p', !rows.length && modeRows.length ? 'No records match these filters.' : all.some(r => r.a.exercise === mode) ? 'No matching records in this period. Try a wider period.' : 'No records for this exercise yet.'), button('Show all time', () => { view.days = 0; }), button('Clear filters', () => { reset(); view.production = 'all'; }), button('Practice ' + exerciseNames[mode], () => { const progression = modeForExercise(mode); location.hash = progression ? 'progression/' + progression : 'home'; }));
                finish();
                return;
            }
            const trend = insightTrend(insightFilter(allMode, { key: view.key, root: view.root, quality: view.quality, chord: view.chord, degree: view.degree }), view.days), trendSection = el('section', '', 'insight-trend');
            trendSection.append(el('h3', 'Comparable recorded change'));
            if (trend.delta === null)
                trendSection.append(el('p', view.days ? 'Not enough matching-condition evidence to compare periods.' : 'All time has no automatic previous-period comparison.'));
            else
                trendSection.append(el('strong', `${Math.abs(trend.delta).toFixed(1)} percentage points ${trend.delta < 0 ? 'lower' : trend.delta > 0 ? 'higher' : 'change'}`), el('p', `Matched current: ${trend.current.correct}/${trend.current.n} · ${trend.current.questions} questions · ${trend.current.sessions} sessions; previous: ${trend.previous.correct}/${trend.previous.n} · ${trend.previous.questions} questions · ${trend.previous.sessions} sessions. Current coverage: ${trend.current.n}/${trend.totalCurrent} assessed notes.`), details('Compared practice conditions', ...trend.details.map(g => el('p', `${g.label}: ${g.previous.correct}/${g.previous.n} → ${g.current.correct}/${g.current.n}`))));
            if (trend.delta !== null)
                trendSection.append(el('p', 'Recorded observations only; not proof of learning or transfer.', 'insight-scope-note'));
            host.append(trendSection);
            const priorities = insightPriorities(rows, view.baseline, { key: view.key, root: view.root, quality: view.quality, chord: view.chord, degree: view.degree }), next = el('section', '', 'insight-priorities');
            next.append(el('h2', 'What to practise next'));
            next.append(el('p', 'Additional suggestions under matching practice conditions. The summary above describes the full selected scope.', 'insight-scope-note'));
            if (!priorities.errors.length)
                next.append(el('p', 'No additional matching-condition error recommendation meets the evidence thresholds. Coverage gaps below are not weaknesses.'));
            if (priorities.stratum)
                next.append(el('p', 'Recurrent errors within: ' + insightConditionLabel(priorities.stratum[0]), 'insight-scope-note'));
            const coverage = details('Practice coverage');
            if (priorities.baselines.length > 1) {
                const l = el('label', 'Coverage setup'), s = el('select');
                s.setAttribute('aria-label', 'Coverage setup');
                s.dataset.insightControl = 'Coverage setup';
                for (const r of priorities.baselines) {
                    const o = el('option', insightConditionLabel(r));
                    o.value = r.a.id;
                    s.append(o);
                }
                s.value = priorities.baseline.a.id;
                s.onchange = () => { view.baseline = s.value; render(); };
                l.append(s);
                coverage.append(l);
            }
            else if (priorities.baseline)
                coverage.append(details('Coverage setup', el('p', insightConditionLabel(priorities.baseline))));
            for (const item of [...priorities.errors, ...priorities.gaps]) {
                const row = el('article', '', 'insight-priority');
                row.append(el('h3', item.label), el('p', item.kind === 'error' ? 'Repeated first-response errors' : 'Coverage gap · insufficient practice, not a weakness'), el('p', item.m.questions ? `${item.m.correct} / ${item.m.n} assessed · ${item.m.questions} questions · ${item.m.sessions} sessions` : 'No assessed records under this setup'));
                if (onSetup && item.basis.sourceKnown) {
                    const setup = button('Setup practice: ' + item.label, () => onSetup(item.basis, item.label, item.filters));
                    setup.setAttribute('aria-label', 'Setup practice: ' + item.label);
                    setup.textContent = 'Setup practice';
                    setup.classList.remove('secondary');
                    row.append(setup);
                }
                const evidenceButton = button('View evidence: ' + item.label, () => { reset(); Object.assign(view, item.filters); if (item.kind === 'error')
                    view.condition = insightStratum(item.basis) ?? '';
                else
                    view.setup = insightSetupId(item.basis); view.dimension = item.filters.degree ? 'Degree' : 'Chord'; });
                evidenceButton.setAttribute('aria-label', 'View evidence: ' + item.label);
                evidenceButton.textContent = 'View evidence';
                row.append(evidenceButton);
                (item.kind === 'gap' ? coverage : next).append(row);
            }
            next.append(coverage);
            const lead = el('div', '', 'insight-lead'), performance = el('div');
            performance.append(trendSection);
            lead.append(performance, next);
            host.append(musicalOverview(rows, onSetup), lead);
            const analysis = el('section', '', 'insight-analysis');
            analysis.append(el('h2', 'Explore the music'));
            const tabs = el('div', '', 'insight-tabs');
            for (const name of ['Key', 'Chord', 'Degree'])
                tabs.append(button(name === 'Key' && view.context === 'Single Chord' ? 'Chord root' : name, () => { view.dimension = name; view.all = false; }, view.dimension === name));
            analysis.append(tabs);
            const chips = el('div', '', 'insight-chips');
            if (view.condition)
                chips.append(button('Matching practice conditions · remove', () => { view.condition = ''; }));
            if (view.setup)
                chips.append(button('Coverage setup · remove', () => { view.setup = ''; }));
            for (const name of ['key', 'root', 'quality', 'chord', 'degree'])
                if (view[name])
                    chips.append(button(name + ': ' + view[name] + ' · remove', () => { view[name] = ''; }));
            if (chips.children.length)
                chips.append(button('Clear filters', reset));
            currentScope.replaceChildren(chips);
            const filters = el('div', '', 'insight-filters');
            filters.append(select('Root', view.root || 'All roots', ['All roots', ...new Set(modeRows.map(r => r.root))], v => { view.root = v === 'All roots' ? '' : v; }), select('Chord quality', view.quality || 'All qualities', ['All qualities', ...new Set(modeRows.map(r => r.quality))], v => { view.quality = v === 'All qualities' ? '' : v; }));
            if (mode === 'm1')
                filters.append(select('Production category', view.production, ['all', 'imagined-sung', 'played'], v => { view.production = v; }));
            analysis.append(details('More filters', filters));
            if (view.dimension === 'Key') {
                analysis.append(el('p', view.context === 'Single Chord' ? 'Grouped by chord root; tonality is not inferred.' : 'Actual playback key, not chord root. Mixed conditions are descriptive.', 'insight-scope-note'));
                const dimension = view.context === 'Single Chord' ? 'root' : 'key';
                let keyRows = insightFilter(modeRows, { ...{ key: view.key, root: view.root, quality: view.quality, chord: view.chord, degree: view.degree }, [dimension]: '' });
                if (view.context === 'Progression') {
                    analysis.append(button('Compare matching conditions', () => { view.comparable = !view.comparable; }, view.comparable));
                    if (view.comparable) {
                        const report = insightKeyComparison(keyRows);
                        keyRows = report.items;
                        analysis.append(el('p', report.label ?? 'No comparable keys yet. Each key needs sufficient questions and sessions under the same conditions.'));
                    }
                }
                const groups = insightGroups(keyRows, dimension);
                const grid = el('div', '', 'insight-key-grid');
                for (const name of [...insightKeys, ...(groups.some(g => g.label === 'Not recorded') ? ['Not recorded'] : [])]) {
                    const group = groups.find(g => g.label === name), m = insightStats(group?.items ?? []);
                    const item = button(name, () => { view[dimension] = name; view.dimension = 'Chord'; }, view[dimension] === name);
                    item.setAttribute('aria-label', 'Inspect ' + name);
                    if (dimension === 'root' && group && group.displayLabel !== name)
                        item.append(el('small', 'Recorded as ' + group.displayLabel));
                    item.append(el(m.n ? 'strong' : 'span', m.n ? percent(m) : m.unassessed ? 'Unassessed only' : 'No records'));
                    if (m.questions)
                        item.append(el('span', `${m.correct}/${m.n} assessed`), el('small', `${m.questions} questions`), el('small', !insightEligible(group?.items ?? []) ? 'Limited sample' : 'Recorded'));
                    grid.append(item);
                }
                analysis.append(grid);
            }
            else {
                if (view.dimension === 'Chord')
                    analysis.append(select('Chord view', view.chordView, ['Chord quality', 'Full chord'], v => { view.chordView = v; }));
                analysis.append(select('Sort', view.sort, ['Errors', 'Practice volume', 'Name'], v => { view.sort = v; }));
                const dimension = view.dimension === 'Degree' ? 'degree' : view.chordView === 'Full chord' ? 'chord' : 'quality';
                const groups = insightGroups(rows, dimension).sort((a, b) => view.sort === 'Name' ? a.label.localeCompare(b.label) : view.sort === 'Practice volume' ? b.m.n - a.m.n || a.label.localeCompare(b.label) : ((b.m.n - b.m.correct) / (b.m.n || 1) - (a.m.n - a.m.correct) / (a.m.n || 1)) || (b.m.n - b.m.correct) - (a.m.n - a.m.correct) || b.m.n - a.m.n || a.label.localeCompare(b.label));
                analysis.append(el('p', 'Recorded outcomes, not an ability ranking. Conditions and sample sizes may differ.', 'insight-scope-note'));
                for (const group of view.all ? groups : groups.slice(0, 5)) {
                    const row = el('article', '', 'insight-data-row');
                    row.append(el('h3', group.displayLabel), el('strong', percent(group.m)), el('p', `${group.m.correct} / ${group.m.n} assessed · ${group.m.questions} questions · ${group.m.sessions} sessions`));
                    if (!insightEligible(group.items))
                        row.append(el('small', 'Insufficient sample'));
                    row.append(button('Inspect ' + group.label, () => { if (dimension === 'degree') {
                        const [quality, degree] = group.label.split(' / ');
                        view.quality = quality;
                        view.degree = degree;
                    }
                    else {
                        view[dimension] = group.label;
                        view.dimension = 'Degree';
                    } }));
                    analysis.append(row);
                }
                if (groups.length > 5)
                    analysis.append(button(view.all ? 'Show fewer' : 'All ' + (view.dimension === 'Chord' ? 'chords' : 'degrees'), () => { view.all = !view.all; }));
            }
            host.append(analysis);
            if (view.context === 'Single Chord' || view.family === 'Play by Ear') {
                const selected = insightFilter(modeRows, { key: view.key, root: view.root, quality: view.quality, chord: view.chord });
                const ids = new Set(selected.map(r => r.questionId));
                const timingRows = view.family === 'Play by Ear' ? modeRows.filter(r => ids.has(r.questionId)) : selected.filter(r => !view.degree || r.degree === view.degree);
                const report = insightEfficiency(timingRows), efficiency = el('section', '', 'insight-efficiency');
                efficiency.append(el('h2', view.family === 'Play by Ear' ? 'Post-accompaniment completion delay' : 'Correct-response completion time'));
                efficiency.append(el('p', view.family === 'Play by Ear' ? 'Whole questions only · all-correct, unassisted and uninterrupted · includes button interaction. Not per-note or per-chord playing speed.' : 'Valid first-correct responses only · includes interaction. Audiation is self-rated; methods remain separate.', 'insight-scope-note'));
                if (view.family === 'Play by Ear')
                    efficiency.append(el('p', view.degree ? 'Timing scope: parent questions; the degree filter is not applied to time.' : 'Timing scope: whole questions' + (view.chord || view.root || view.quality ? ' containing the selected chords.' : '.')));
                if (!report.groups.length)
                    efficiency.append(el('p', 'Unavailable · n=0 eligible questions'));
                const values = report.groups.map(g => el('p', `${(g.median / 1000).toFixed(2)}s median · n=${g.n} · ${g.label}`));
                efficiency.append(...values.slice(0, 3));
                if (values.length > 3)
                    efficiency.append(details('All timing conditions', ...values.slice(3)));
                efficiency.append(details('Timing exclusions', ...report.excluded.map(x => el('p', x.reason + ': ' + x.n))));
                host.append(efficiency);
            }
            const table = (caption, groups) => {
                const scroll = el('div', '', 'table-scroll');
                scroll.tabIndex = 0;
                scroll.setAttribute('role', 'region');
                scroll.setAttribute('aria-label', caption);
                const t = el('table');
                t.append(el('caption', caption));
                const thead = el('thead'), tr = el('tr');
                for (const title of ['Music', 'Correct / assessed', 'Questions', 'Sessions', 'Replay-assisted']) {
                    const th = el('th', title);
                    th.scope = 'col';
                    tr.append(th);
                }
                thead.append(tr);
                t.append(thead);
                const body = el('tbody');
                for (const g of groups) {
                    const row = el('tr');
                    row.append(el('th', g.displayLabel), el('td', `${g.m.correct}/${g.m.n}`), el('td', String(g.m.questions)), el('td', String(g.m.sessions)), el('td', `${g.m.replayed}/${g.m.n}`));
                    row.firstChild.scope = 'row';
                    body.append(row);
                }
                t.append(body);
                scroll.append(t);
                return scroll;
            };
            const fullGroups = new Map();
            for (const r of rows) {
                const label = (r.context === 'Progression' ? (r.key ?? 'Not recorded') : r.root) + ' / ' + r.chord;
                const items = fullGroups.get(label) ?? [];
                items.push(r);
                fullGroups.set(label, items);
            }
            const full = details('Detailed breakdown', table('Chord quality × degree', insightGroups(rows, 'degree')), table(view.context === 'Progression' ? 'Practice key × chord' : 'Chord root × chord', [...fullGroups].map(([label, items]) => ({ label, displayLabel: [...new Set(items.map(r => (r.context === 'Progression' ? (r.key ?? 'Not recorded') : r.rootLabel) + ' / ' + r.chordLabel))].join('; '), items, m: insightStats(items) }))));
            const chordDegrees = new Map();
            for (const r of rows) {
                const label = r.chord + ' / ' + r.degree, items = chordDegrees.get(label) ?? [];
                items.push(r);
                chordDegrees.set(label, items);
            }
            full.append(table('Full chord × degree', [...chordDegrees].map(([label, items]) => ({ label, displayLabel: [...new Set(items.map(r => r.chordLabel + ' / ' + r.degree))].join('; '), items, m: insightStats(items) }))));
            host.append(full);
            const sources = new Map();
            for (const r of rows) {
                const identity = JSON.stringify(r.source);
                if (!sources.has(identity))
                    sources.set(identity, r);
            }
            const conditions = details('Source conditions', dateFacts);
            for (const r of sources.values()) {
                const label = insightConditionLabel(r), c = r.source, section = el('section');
                section.append(el('h3', label));
                if ('mode' in c)
                    section.append(el('p', 'Target pools: ' + Object.entries(c.pools).map(([q, p]) => q + ': ' + p?.join(', ')).join('; ')), el('p', 'Voicing mix: ' + c.levels.map(n => Math.round(n * 100) + '%').join(', ')), el('p', 'Volume: ' + Math.round(c.volume * 100) + '%'));
                else
                    section.append(el('p', 'Voicing mix: ' + (c.voiceLevels ?? [1, 1, 1, 1, 1]).map(n => Math.round(n * 100) + '%').join(', ')), el('p', 'Volume: ' + Math.round(c.volume * 100) + '%'));
                section.append(el('p', r.sourceKnown ? 'Source setup recorded' : 'Original C-source not recorded'), el('p', 'Date attribution: ' + r.dateSource));
                conditions.append(section);
            }
            const versions = [...new Set(rows.map(r => (r.generator ?? 'Generator not recorded') + ' · ' + (r.timing ?? 'Timing version not recorded') + ' · exposure ' + (r.exposure ?? 'not recorded')))];
            conditions.append(details('Technical versions', ...versions.map(v => el('p', v))));
            host.append(conditions);
            if (view.chord || view.quality)
                host.append(details('Recorded harmonic contexts', ...Array.from(new Set(Array.from(sources.values()).map(insightConditionLabel))).map(label => el('p', label))));
            const history = details('Sessions'), list = el('ul', '', 'session-history');
            const matched = [...new Set(rows.map(r => r.sessionId))].map(id => ({ id, items: rows.filter(r => r.sessionId === id), whole: all.filter(r => r.sessionId === id) })).sort((a, b) => Math.max(...b.items.map(r => r.time ?? 0)) - Math.max(...a.items.map(r => r.time ?? 0)));
            for (const [i, session] of matched.entries()) {
                const first = session.items[0], date = first.time === null ? 'Date not recorded' : dateLabel(first.time), m = insightStats(session.items), whole = insightStats(session.whole), li = el('li'), link = el('a', `${date} · ${exerciseNames[first.a.exercise]} · matching ${m.n} assessed notes / ${whole.n} session assessed notes · ${m.questions} matching questions`);
                link.href = first.href;
                li.append(link);
                list.append(li);
                if (i === 0) {
                    const latest = el('a', 'View latest matching session', 'session-link');
                    latest.href = first.href;
                    history.append(latest);
                }
            }
            history.append(list);
            host.append(history);
            if (!rows.length) {
                host.append(el('p', all.some(r => r.a.exercise === mode) ? 'No matching records in this period. Try a wider period.' : 'No records for this exercise yet.'), button('Show all time', () => { view.days = 0; }), button('Practice ' + exerciseNames[mode], () => { const progression = modeForExercise(mode); location.hash = progression ? 'progression/' + progression : 'home'; }));
            }
        }
        if (!all.length)
            host.prepend(el('p', 'No V2 records in this browser. Choose an exercise to begin.'));
        finish();
    }
    render();
}
