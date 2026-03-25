'use strict';

/* ============================================================
   PocketMine Timings Analyzer
   Parser → Analyzer → Aggregator → UI
   Multi-report batch analysis with i18n (EN/RU)
   ============================================================ */

// ─── i18n ───────────────────────────────────────────────────

const I18N = {
    en: {
        heroSub: 'Detect lag sources, GC spikes & plugin bottlenecks in your <strong>PocketMine-MP</strong> server',
        tabPaste: 'Paste Text', tabUrl: 'From URL', tabFile: 'Upload Files',
        pastePlaceholder: 'Paste your raw timings text here...\n\nMultiple reports: separate with a line containing only ===\n\nGet raw text: timings.pmmp.io → your report → add &raw=1 to URL',
        urlPlaceholder: 'https://timings.pmmp.io/?id=...&access_token=...\n\nOne URL per line for batch analysis',
        urlHint: "We'll fetch raw data automatically via CORS proxy. One URL per line for batch analysis.",
        fileDrop: 'Tap to select or drop .txt files (multiple supported)',
        btnAnalyze: 'Analyze Timings', btnDemo: 'Try Demo', btnNew: 'New Analysis',
        fetching: 'Fetching', expandAll: 'Expand All', collapseAll: 'Collapse All', filter: 'Filter...',
        // Sections
        dashboard: 'Dashboard', detectedIssues: 'Detected Issues', worldLoad: 'World Load Distribution',
        pluginImpact: 'Plugin Impact', timingsTree: 'Timings Tree', serverHealth: 'Server Health',
        // Metrics
        mTps: 'TPS', mAvgTick: 'Avg Tick', mPeakTick: 'Peak Tick', mViolations: 'Violations',
        mPlayers: 'Avg Players', mEntities: 'Avg Entities', mThreadLoad: 'Thread Load', mSampleTime: 'Sample Time',
        // Aggregate
        aggTitle: 'Aggregate Summary',
        aggReports: 'Reports', aggAvgHealth: 'Avg Health', aggWorstHealth: 'Worst Health', aggTotalIssues: 'Total Issues',
        aggTableReport: 'Report', aggTableTps: 'TPS', aggTableAvgTick: 'Avg Tick', aggTablePeak: 'Peak',
        aggTableViolations: 'Violations', aggTablePlayers: 'Players', aggTableHealth: 'Health',
        aggRecsTitle: 'Optimization Recommendations',
        aggNoIssues: 'No issues detected! All servers are running great.',
        noIssues: 'No issues detected! Your server is running great.',
        // Issue titles
        issGc: 'Garbage Collector Freezes', issForm: 'Slow Form Handler Callbacks',
        issEntity: 'Heavy Entity', issTask: 'Slow Task', issNetRecv: 'High Network Receive Overhead',
        issNetSend: 'High Network Send Overhead', issChunk: 'Chunk Loading Overhead',
        issRandom: 'Heavy Random Chunk Updates', issNeighbour: 'Neighbour Block Update Overhead',
        issScheduled: 'Scheduled Block Update Overhead', issEvent: 'Heavy Event Handler',
        issExplosion: 'Explosion Processing Overhead', issViolations: 'High Violations',
        // Recs
        recGcHigh: 'GC threshold is too high, allowing roots to accumulate. Reduce GC_THRESHOLD_CAP or call gc_collect_cycles() more frequently.',
        recGcLow: 'Minor GC overhead. Monitor root counts — if they grow above 10k, consider lowering GC threshold.',
        recForm: "Profile which plugin's form callback causes this. Move heavy operations to async tasks.",
        recEntity: 'Check if this entity broadcasts packets every tick. Consider reducing update frequency or limiting entity count.',
        recTask: 'Profile this task. If it does heavy I/O, consider splitting across ticks or moving to AsyncTask.',
        recNetRecv: 'Check DataPacketReceiveEvent handlers. Anticheats and packet-heavy plugins are common culprits.',
        recNetSend: 'Reduce view distance, limit entity count, or check for plugins that broadcast packets excessively.',
        recChunk: 'Pre-generate chunks in frequently visited areas. Reduce view distance if needed.',
        recRandom: 'Reduce random-tick-speed in pocketmine.yml or unload unused worlds.',
        recNeighbour: 'Consider limiting neighbour update rate per tick. Explosions and world edits trigger cascading updates.',
        recScheduled: 'Consider limiting scheduled block updates per tick or disabling liquid flow in heavy worlds.',
        recExplosion: 'Limit TNT/creeper explosions or reduce explosion radius. Consider queuing across ticks.',
        recViolations: 'Investigate what causes spikes in this operation.',
        // Aggregate recs
        aggRecGcAll: 'GC freezes detected across all servers. Patch GarbageCollectorManager to add GC_THRESHOLD_CAP.',
        aggRecGcSome: 'GC freezes found on {n}/{total} servers. Check GC threshold configuration.',
        aggRecFormAll: 'Slow form callbacks on all servers. Profile ModalFormResponsePacket handlers.',
        aggRecPluginHeavy: 'Plugin "{name}" is the heaviest across {n} reports (avg {pct}% of tick). Consider optimizing.',
        aggRecViewDist: 'High chunk/network load on {n} servers. Reduce view-distance to 6.',
        aggRecEntities: '{n} servers have heavy custom entities. Limit spawn counts or reduce tick frequency.',
        foundOn: 'Found on',
    },
    ru: {
        heroSub: 'Находи причины лагов, фризы GC и тяжёлые плагины на сервере <strong>PocketMine-MP</strong>',
        tabPaste: 'Вставить текст', tabUrl: 'Из URL', tabFile: 'Загрузить файлы',
        pastePlaceholder: 'Вставьте сырой текст таймингов...\n\nНесколько отчётов: разделяйте строкой ===\n\nСырой текст: timings.pmmp.io → ваш отчёт → добавьте &raw=1 к URL',
        urlPlaceholder: 'https://timings.pmmp.io/?id=...&access_token=...\n\nПо одному URL на строку для пакетного анализа',
        urlHint: 'Мы автоматически получим данные через CORS-прокси. По одному URL на строку.',
        fileDrop: 'Нажмите или перетащите .txt файлы (можно несколько)',
        btnAnalyze: 'Анализировать', btnDemo: 'Демо', btnNew: 'Новый анализ',
        fetching: 'Загрузка', expandAll: 'Развернуть всё', collapseAll: 'Свернуть всё', filter: 'Поиск...',
        dashboard: 'Обзор', detectedIssues: 'Обнаруженные проблемы', worldLoad: 'Нагрузка по мирам',
        pluginImpact: 'Влияние плагинов', timingsTree: 'Дерево таймингов', serverHealth: 'Здоровье сервера',
        mTps: 'TPS', mAvgTick: 'Ср. тик', mPeakTick: 'Пик тика', mViolations: 'Нарушения',
        mPlayers: 'Ср. игроков', mEntities: 'Ср. сущностей', mThreadLoad: 'Нагрузка потока', mSampleTime: 'Время записи',
        aggTitle: 'Общая сводка',
        aggReports: 'Отчётов', aggAvgHealth: 'Ср. здоровье', aggWorstHealth: 'Худшее', aggTotalIssues: 'Всего проблем',
        aggTableReport: 'Отчёт', aggTableTps: 'TPS', aggTableAvgTick: 'Ср. тик', aggTablePeak: 'Пик',
        aggTableViolations: 'Нарушения', aggTablePlayers: 'Игроки', aggTableHealth: 'Здоровье',
        aggRecsTitle: 'Рекомендации по оптимизации',
        aggNoIssues: 'Проблем не обнаружено! Все серверы работают отлично.',
        noIssues: 'Проблем не обнаружено! Сервер работает отлично.',
        issGc: 'Фризы сборщика мусора', issForm: 'Медленные обработчики форм',
        issEntity: 'Тяжёлая сущность', issTask: 'Медленная задача', issNetRecv: 'Высокая нагрузка приёма пакетов',
        issNetSend: 'Высокая нагрузка отправки пакетов', issChunk: 'Нагрузка загрузки чанков',
        issRandom: 'Тяжёлые случайные обновления чанков', issNeighbour: 'Нагрузка обновлений соседних блоков',
        issScheduled: 'Нагрузка плановых обновлений блоков', issEvent: 'Тяжёлый обработчик событий',
        issExplosion: 'Нагрузка обработки взрывов', issViolations: 'Частые нарушения',
        recGcHigh: 'Порог GC слишком высокий, корни накапливаются. Уменьшите GC_THRESHOLD_CAP или запускайте gc_collect_cycles() чаще.',
        recGcLow: 'Небольшая нагрузка GC. Следите за количеством корней — если больше 10к, снижайте порог.',
        recForm: 'Определите, какой плагин вызывает тяжёлый callback в формах. Перенесите тяжёлые операции в async.',
        recEntity: 'Проверьте, рассылает ли сущность пакеты каждый тик. Уменьшите частоту обновлений или лимит сущностей.',
        recTask: 'Если задача делает тяжёлый I/O, разбейте на несколько тиков или перенесите в AsyncTask.',
        recNetRecv: 'Проверьте обработчики DataPacketReceiveEvent. Античиты и тяжёлые плагины — частые причины.',
        recNetSend: 'Уменьшите view-distance, ограничьте количество сущностей или проверьте плагины с массовой рассылкой.',
        recChunk: 'Прегенерируйте чанки в популярных зонах. Уменьшите view-distance при необходимости.',
        recRandom: 'Уменьшите random-tick-speed в pocketmine.yml или выгрузите неиспользуемые миры.',
        recNeighbour: 'Ограничьте обновления соседних блоков за тик. Взрывы и WorldEdit вызывают каскады.',
        recScheduled: 'Ограничьте плановые обновления за тик или отключите растекание жидкости в нагруженных мирах.',
        recExplosion: 'Ограничьте TNT/криперов или уменьшите радиус взрывов. Можно ставить в очередь по тикам.',
        recViolations: 'Исследуйте, что вызывает всплески в этой операции.',
        aggRecGcAll: 'Фризы GC обнаружены на всех серверах. Запатчите GarbageCollectorManager — добавьте GC_THRESHOLD_CAP.',
        aggRecGcSome: 'Фризы GC найдены на {n}/{total} серверах. Проверьте конфигурацию порога GC.',
        aggRecFormAll: 'Медленные callback-и форм на всех серверах. Профилируйте обработчики ModalFormResponsePacket.',
        aggRecPluginHeavy: 'Плагин «{name}» самый тяжёлый на {n} серверах (в среднем {pct}% тика). Стоит оптимизировать.',
        aggRecViewDist: 'Высокая нагрузка чанков/сети на {n} серверах. Уменьшите view-distance до 6.',
        aggRecEntities: '{n} серверов имеют тяжёлые кастомные сущности. Ограничьте спавн или частоту тиков.',
        foundOn: 'Найдено на',
    }
};

let currentLang = localStorage.getItem('pmmp-lang') || 'en';
function t(key) { return (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key; }
function tReplace(key, vars) {
    let s = t(key);
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
}

// ─── Parser ─────────────────────────────────────────────────

class TimingsParser {
    parse(raw) {
        const lines = raw.split('\n');
        const nodes = [], nodeMap = {};
        let meta = { version: '', engine: '', formatVersion: '', sampleTime: 0, sampleTimeStr: '' };
        const plugins = {};
        let currentPlugin = null, inAsync = false;

        for (const line of lines) {
            if (!line.trim()) continue;
            if (line.startsWith('# Version ')) { meta.version = line.slice(10).trim(); continue; }
            if (line.startsWith('# ') && (line.includes('Engine') || line.includes('PocketMine'))) { meta.engine = line.slice(2).trim(); continue; }
            if (line.startsWith('# FormatVersion ')) { meta.formatVersion = line.slice(16).trim(); continue; }
            if (line.startsWith('Sample time ')) {
                const m = line.match(/Sample time (\d+)\s*\(([^)]+)\)/);
                if (m) { meta.sampleTime = parseInt(m[1]); meta.sampleTimeStr = m[2]; }
                continue;
            }
            if (line.match(/^Async/i) || line.match(/^ThreadId:/)) { inAsync = true; currentPlugin = null; continue; }
            if (line === 'Minecraft' || line.match(/^Minecraft ThreadId:/)) { inAsync = false; currentPlugin = null; continue; }
            if (inAsync) continue;
            if (!line.startsWith(' ') && !line.includes(' Time: ') && line.match(/^[\w\\]+\s+v[\d.]+/)) {
                currentPlugin = line.trim();
                if (!plugins[currentPlugin]) plugins[currentPlugin] = [];
                continue;
            }
            const entry = this._parseLine(line);
            if (!entry) continue;
            entry.plugin = currentPlugin;
            entry.children = [];
            nodes.push(entry);
            nodeMap[entry.recordId] = entry;
            if (currentPlugin) plugins[currentPlugin].push(entry);
        }
        const roots = [];
        for (const node of nodes) {
            if (node.parentRecordId && nodeMap[node.parentRecordId]) nodeMap[node.parentRecordId].children.push(node);
            else roots.push(node);
        }
        return { nodes, roots, meta, plugins, nodeMap };
    }
    _parseLine(line) {
        const indent = line.search(/\S/);
        if (indent < 0) return null;
        const decoded = line.trim().replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"');
        const m = decoded.match(/^(.+?)\s+Time:\s*(\d+)\s+Count:\s*(\d+)\s+Avg:\s*([\d.]+)\s+Violations:\s*(\d+)\s+RecordId:\s*(\d+)\s+ParentRecordId:\s*(\d+|none)\s+TimerId:\s*(\d+)\s+Ticks:\s*(\d+)\s+Peak:\s*(\d+)/);
        if (!m) return null;
        return { name: m[1].trim(), time: +m[2], count: +m[3], avg: +m[4], violations: +m[5],
            recordId: m[6], parentRecordId: m[7] === 'none' ? null : m[7], timerId: m[8],
            ticks: +m[9], peak: +m[10], depth: Math.floor(indent / 4), children: [], plugin: null };
    }
}

// ─── Analyzer ───────────────────────────────────────────────

class TimingsAnalyzer {
    analyze(parsed) {
        const { nodes, roots, meta, plugins } = parsed;
        const ft = nodes.find(n => n.name === 'Full Server Tick');
        const gc = nodes.find(n => n.name === 'Cyclic Garbage Collector');
        const T = ft ? ft.time : 1, ticks = ft ? ft.ticks : 1;
        const avgMs = ft ? ft.avg / 1e6 : 0, peakMs = ft ? ft.peak / 1e6 : 0;
        const violations = ft ? ft.violations : 0;
        let tps = 20;
        if (meta.sampleTime > 0) tps = Math.min(20, ticks / (meta.sampleTime / 1e9));
        else if (avgMs > 50) tps = 1000 / avgMs;
        const stNs = meta.sampleTime || ticks * 5e7;
        const load = (T / stNs) * 100;
        const pTicks = nodes.filter(n => n.name === 'Entity Tick - Player');
        const avgP = pTicks.reduce((s, n) => s + n.count, 0) / Math.max(1, ticks);
        const eTicks = nodes.filter(n => n.name.startsWith('Entity Tick - '));
        const avgE = eTicks.reduce((s, n) => s + n.count, 0) / Math.max(1, ticks);
        const stSec = meta.sampleTime ? meta.sampleTime / 1e9 : ticks * 0.05;
        const stFmt = stSec > 60 ? `${(stSec / 60).toFixed(1)} min` : `${stSec.toFixed(1)}s`;
        const worlds = this._worlds(nodes, T);
        const pluginImpact = this._plugins(plugins, T);
        const issues = this._issues(nodes, ft, gc, T, ticks, avgMs);
        const health = this._health(tps, avgMs, peakMs, violations, ticks, issues);
        return { tps: Math.round(tps * 100) / 100, avgTickMs: Math.round(avgMs * 100) / 100,
            peakTickMs: Math.round(peakMs * 100) / 100, totalViolations: violations,
            avgPlayers: Math.round(avgP * 10) / 10, avgEntities: Math.round(avgE * 10) / 10,
            mainThreadLoad: Math.round(load * 10) / 10, sampleTimeFormatted: stFmt, ticks,
            worlds, pluginImpact, issues, health, meta };
    }
    _worlds(nodes, T) {
        return nodes.filter(n => n.name.endsWith(' - World Tick') && !n.name.startsWith('Worlds'))
            .map(w => ({ name: w.name.replace(' - World Tick', ''), avgMs: w.avg / 1e6,
                totalMs: w.time / 1e6, pct: (w.time / T) * 100, peakMs: w.peak / 1e6, violations: w.violations }))
            .sort((a, b) => b.totalMs - a.totalMs);
    }
    _plugins(plugins, T) {
        const r = [];
        for (const [name, entries] of Object.entries(plugins)) {
            const tot = entries.reduce((s, e) => s + e.time, 0);
            const viol = entries.reduce((s, e) => s + e.violations, 0);
            const pk = entries.reduce((b, e) => e.peak > b.peak ? e : b, entries[0]);
            r.push({ name, totalMs: tot / 1e6, pct: (tot / T) * 100, violations: viol,
                peakMs: pk ? pk.peak / 1e6 : 0, peakName: pk ? pk.name : '', entryCount: entries.length });
        }
        return r.sort((a, b) => b.totalMs - a.totalMs);
    }
    _issues(nodes, ft, gc, T, ticks, avgMs) {
        const issues = [];
        const add = (sev, titleKey, title, body, metrics, recKey) =>
            issues.push({ severity: sev, titleKey, title, body, metrics, recKey });

        // GC
        if (gc) {
            const a = gc.avg / 1e6, p = gc.peak / 1e6, pct = (gc.time / T) * 100;
            if (a > 5 || p > 50 || pct > 2) {
                add(p > 200 ? 'critical' : (p > 50 || a > 20) ? 'warning' : 'info', 'issGc', '',
                    `GC: <strong>${gc.count}</strong>x, avg <strong>${a.toFixed(1)}ms</strong>, peak <strong>${p.toFixed(0)}ms</strong>, ${pct.toFixed(1)}% tick, ${gc.violations}v`,
                    [`avg: ${a.toFixed(1)}ms`, `peak: ${p.toFixed(0)}ms`, `${pct.toFixed(1)}%`],
                    a > 20 ? 'recGcHigh' : 'recGcLow');
            }
        }
        // Forms
        const fh = nodes.find(n => n.name.includes('Handler - ModalFormResponsePacket'));
        if (fh && (fh.avg > 1e6 || fh.violations > 0)) {
            const a = fh.avg / 1e6, p = fh.peak / 1e6;
            add(p > 100 ? 'critical' : 'warning', 'issForm', '',
                `ModalForm avg <strong>${a.toFixed(1)}ms</strong>, peak <strong>${p.toFixed(0)}ms</strong>, ${fh.violations}v, ${fh.count} calls`,
                [`avg: ${a.toFixed(1)}ms`, `peak: ${p.toFixed(0)}ms`], 'recForm');
        }
        // Entities
        for (const e of nodes.filter(n => n.name.startsWith('Entity Tick - ') && !n.name.includes('Player') && !n.name.includes('ItemEntity'))) {
            const pct = (e.time / T) * 100;
            if (pct > 3 || e.avg > 2e5) {
                add(pct > 8 ? 'critical' : 'warning', 'issEntity',
                    `${t('issEntity')}: ${e.name.replace('Entity Tick - ', '')}`,
                    `${pct.toFixed(1)}% tick, ${(e.avg / 1e3).toFixed(0)}\u00b5s avg, peak ${(e.peak / 1e6).toFixed(1)}ms`,
                    [`${pct.toFixed(1)}%`, `count: ${e.count}`], 'recEntity');
            }
        }
        // Tasks
        for (const t2 of nodes.filter(n => n.name.startsWith('Task: '))) {
            if (t2.avg > 5e5 || t2.violations > 0) {
                const a = t2.avg / 1e6, p = t2.peak / 1e6;
                add(t2.violations > 5 ? 'critical' : t2.violations > 0 ? 'warning' : 'info', 'issTask',
                    `${t('issTask')}: ${this._short(t2.name)}`,
                    `avg ${a.toFixed(1)}ms, peak ${p.toFixed(0)}ms, ${t2.violations}v / ${t2.count} runs`,
                    [`avg: ${a.toFixed(1)}ms`, `violations: ${t2.violations}`], 'recTask');
            }
        }
        // Network recv/send, chunks, random, neighbour, scheduled, explosions
        this._pctIssue(nodes, T, 'Player Network Receive', 25, 40, 'issNetRecv', 'recNetRecv', issues);
        this._pctIssue(nodes, T, 'Player Network Send', 15, 30, 'issNetSend', 'recNetSend', issues);
        this._endsWith(nodes, T, ' - Chunk Load', 5, 15, 'issChunk', 'recChunk', issues);
        this._endsWith(nodes, T, ' - Random Chunk Updates', 10, 20, 'issRandom', 'recRandom', issues);
        this._endsWith(nodes, T, ' - Neighbour Block Updates', 8, 15, 'issNeighbour', 'recNeighbour', issues);
        this._endsWith(nodes, T, ' - Scheduled Block Updates', 5, 12, 'issScheduled', 'recScheduled', issues);
        // Explosions
        const expl = nodes.filter(n => n.name.includes('Explosion'));
        const explPct = (expl.reduce((s, n) => s + n.time, 0) / T) * 100;
        if (explPct > 3) add(explPct > 8 ? 'warning' : 'info', 'issExplosion', '', `${explPct.toFixed(1)}% tick`,
            [`${explPct.toFixed(1)}%`], 'recExplosion');
        // Event handlers
        for (const eh of nodes.filter(n => n.name.includes('->') && n.name.includes('Event') && !n.name.includes('ModalFormResponse'))) {
            const pct = (eh.time / T) * 100;
            if (pct > 3 || eh.violations > 3) {
                if (issues.some(i => i.title && i.title.includes(this._short(eh.name)))) continue;
                add(eh.violations > 10 ? 'warning' : 'info', 'issEvent',
                    `${t('issEvent')}: ${this._short(eh.name)}`,
                    `${pct.toFixed(1)}% tick, avg ${(eh.avg / 1e6).toFixed(1)}ms, ${eh.violations}v`,
                    [`${pct.toFixed(1)}%`, `violations: ${eh.violations}`], 'recViolations');
            }
        }
        // High violations
        const hv = nodes.filter(n => n.violations > 3 && !['Full Server Tick', 'Server Tick Update Cycle', 'Server Mid-Tick Processing'].includes(n.name))
            .sort((a, b) => b.violations - a.violations).slice(0, 5);
        for (const e of hv) {
            if (issues.some(i => i.title && i.title.includes(this._short(e.name)))) continue;
            if (['Cyclic Garbage Collector', 'Memory Manager'].includes(e.name)) continue;
            if (e.name.includes('Connection Handler') || e.name.includes('Player Network') || e.name.endsWith(' - World Tick')) continue;
            add(e.violations > 20 ? 'warning' : 'info', 'issViolations',
                `${t('issViolations')}: ${this._short(e.name)}`,
                `${e.violations}v, avg ${(e.avg / 1e6).toFixed(1)}ms, peak ${(e.peak / 1e6).toFixed(0)}ms`,
                [`violations: ${e.violations}`], 'recViolations');
        }
        issues.sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] - { critical: 0, warning: 1, info: 2 }[b.severity]));
        // Resolve title from key
        for (const i of issues) if (!i.title && i.titleKey) i.title = t(i.titleKey);
        return issues;
    }
    _pctIssue(nodes, T, name, thInfo, thWarn, titleKey, recKey, issues) {
        const tot = nodes.filter(n => n.name === name).reduce((s, n) => s + n.time, 0);
        const pct = (tot / T) * 100;
        if (pct > thInfo) issues.push({ severity: pct > thWarn ? 'warning' : 'info', titleKey, title: t(titleKey),
            body: `${pct.toFixed(1)}% tick`, metrics: [`${pct.toFixed(1)}%`], recKey });
    }
    _endsWith(nodes, T, suffix, thInfo, thWarn, titleKey, recKey, issues) {
        const tot = nodes.filter(n => n.name.endsWith(suffix)).reduce((s, n) => s + n.time, 0);
        const pct = (tot / T) * 100;
        if (pct > thInfo) issues.push({ severity: pct > thWarn ? 'warning' : 'info', titleKey, title: t(titleKey),
            body: `${pct.toFixed(1)}% tick (${(tot / 1e6).toFixed(0)}ms total)`, metrics: [`${pct.toFixed(1)}%`], recKey });
    }
    _short(n) { return n.replace(/^Task:\s*/, '').replace(/.*\\([^\\]+)$/, '$1').replace(/\(interval:\d+\)/, '')
        .replace(/\(Single\)/, '').replace(/-&gt;/g, '\u2192').replace(/->/g, '\u2192').trim(); }
    _health(tps, avg, peak, viol, ticks, issues) {
        let s = 100;
        if (tps < 19.5) s -= Math.min(30, (20 - tps) * 15);
        if (avg > 10) s -= Math.min(20, (avg - 10) * 0.5);
        const vr = viol / Math.max(1, ticks);
        if (vr > 0.01) s -= Math.min(20, vr * 500);
        if (peak > 100) s -= Math.min(15, (peak - 100) / 50);
        s -= Math.min(15, issues.filter(i => i.severity === 'critical').length * 5 + issues.filter(i => i.severity === 'warning').length * 2);
        return Math.max(0, Math.min(100, Math.round(s)));
    }
}

// ─── Aggregator ─────────────────────────────────────────────

class TimingsAggregator {
    aggregate(reports) {
        const n = reports.length;
        const avgHealth = Math.round(reports.reduce((s, r) => s + r.analysis.health, 0) / n);
        const worstHealth = Math.min(...reports.map(r => r.analysis.health));
        const totalIssues = reports.reduce((s, r) => s + r.analysis.issues.length, 0);

        // Common issues by titleKey
        const issueMap = {};
        reports.forEach((r, idx) => {
            for (const iss of r.analysis.issues) {
                const key = iss.title || iss.titleKey;
                if (!issueMap[key]) issueMap[key] = { titleKey: iss.titleKey, title: iss.title, severity: iss.severity, recKey: iss.recKey, reports: [] };
                issueMap[key].reports.push(idx);
                if ({ critical: 0, warning: 1, info: 2 }[iss.severity] < { critical: 0, warning: 1, info: 2 }[issueMap[key].severity])
                    issueMap[key].severity = iss.severity;
            }
        });
        const commonIssues = Object.values(issueMap).sort((a, b) => b.reports.length - a.reports.length);

        // Smart recommendations
        const recs = this._smartRecs(reports, commonIssues, n);

        return { avgHealth, worstHealth, totalIssues, commonIssues, recs, count: n };
    }
    _smartRecs(reports, commonIssues, n) {
        const recs = [];
        // GC
        const gcIssue = commonIssues.find(i => i.titleKey === 'issGc');
        if (gcIssue) {
            recs.push({ severity: gcIssue.reports.length === n ? 'critical' : 'warning',
                text: gcIssue.reports.length === n ? t('aggRecGcAll') : tReplace('aggRecGcSome', { n: gcIssue.reports.length, total: n }),
                reports: gcIssue.reports });
        }
        // Forms
        const formIssue = commonIssues.find(i => i.titleKey === 'issForm');
        if (formIssue && formIssue.reports.length >= Math.ceil(n / 2)) {
            recs.push({ severity: 'warning', text: t('aggRecFormAll'), reports: formIssue.reports });
        }
        // Heaviest plugin
        const pluginMap = {};
        reports.forEach((r, idx) => {
            if (r.analysis.pluginImpact.length > 0) {
                const top = r.analysis.pluginImpact[0];
                const pName = top.name.split(' ')[0];
                if (!pluginMap[pName]) pluginMap[pName] = { name: top.name, pcts: [], reports: [] };
                pluginMap[pName].pcts.push(top.pct);
                pluginMap[pName].reports.push(idx);
            }
        });
        for (const [, p] of Object.entries(pluginMap)) {
            if (p.reports.length >= Math.ceil(n / 2)) {
                const avgPct = (p.pcts.reduce((s, v) => s + v, 0) / p.pcts.length).toFixed(1);
                recs.push({ severity: 'warning',
                    text: tReplace('aggRecPluginHeavy', { name: p.name, n: p.reports.length, pct: avgPct }),
                    reports: p.reports });
            }
        }
        // Chunk / network
        const chunkNet = commonIssues.filter(i => ['issChunk', 'issNetRecv', 'issNetSend'].includes(i.titleKey));
        const cnReports = new Set(chunkNet.flatMap(i => i.reports));
        if (cnReports.size >= 2) {
            recs.push({ severity: 'info', text: tReplace('aggRecViewDist', { n: cnReports.size }),
                reports: [...cnReports] });
        }
        // Entities
        const entIssues = commonIssues.filter(i => i.titleKey === 'issEntity');
        const entReports = new Set(entIssues.flatMap(i => i.reports));
        if (entReports.size >= 2) {
            recs.push({ severity: 'warning', text: tReplace('aggRecEntities', { n: entReports.size }),
                reports: [...entReports] });
        }
        return recs;
    }
}

// ─── UI ─────────────────────────────────────────────────────

class TimingsUI {
    renderMultiple(reports, labels) {
        const container = document.getElementById('reports-container');
        const tabsEl = document.getElementById('report-tabs');
        const aggEl = document.getElementById('aggregate');
        container.innerHTML = '';

        const multi = reports.length > 1;

        // Aggregate
        if (multi) {
            aggEl.classList.remove('hidden');
            const agg = new TimingsAggregator().aggregate(reports);
            this._renderAggregate(aggEl, agg, reports, labels);
        } else { aggEl.classList.add('hidden'); }

        // Tabs
        if (multi) {
            tabsEl.classList.remove('hidden');
            tabsEl.innerHTML = reports.map((r, i) => {
                const hc = r.analysis.health >= 80 ? 'good' : r.analysis.health >= 50 ? 'warn' : 'bad';
                return `<button class="report-tab ${i === 0 ? 'active' : ''}" data-r="${i}">${labels[i]} <span class="rt-health rt-health--${hc}">${r.analysis.health}</span></button>`;
            }).join('');
            tabsEl.onclick = e => {
                const tab = e.target.closest('.report-tab');
                if (!tab) return;
                const idx = +tab.dataset.r;
                tabsEl.querySelectorAll('.report-tab').forEach(t2 => t2.classList.remove('active'));
                tab.classList.add('active');
                container.querySelectorAll('.report-container').forEach((c, i) => c.classList.toggle('active', i === idx));
            };
        } else { tabsEl.classList.add('hidden'); }

        reports.forEach((r, i) => {
            const div = document.createElement('div');
            div.className = `report-container ${i === 0 ? 'active' : ''}`;
            div.innerHTML = this._reportHTML();
            container.appendChild(div);
            this._fillReport(div, r.parsed, r.analysis);
        });

        document.getElementById('results').classList.remove('hidden');
        const hero = document.getElementById('hero');
        hero.style.minHeight = 'auto';
        hero.style.paddingTop = '20px';
        hero.style.paddingBottom = '16px';
        setTimeout(() => (multi ? aggEl : container).scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }

    _renderAggregate(el, agg, reports, labels) {
        const hc = v => v >= 80 ? 'good' : v >= 50 ? 'warn' : 'bad';
        const tpsCls = v => v >= 19.5 ? 'val-good' : v >= 18 ? 'val-warn' : 'val-bad';

        let html = `<h2 class="agg-header">${t('aggTitle')}</h2>`;

        // Summary cards
        html += `<div class="agg-metrics">
            <div class="metric-card metric-card--info"><div class="metric-card__value">${agg.count}</div><div class="metric-card__label">${t('aggReports')}</div></div>
            <div class="metric-card metric-card--${hc(agg.avgHealth)}"><div class="metric-card__value">${agg.avgHealth}</div><div class="metric-card__label">${t('aggAvgHealth')}</div></div>
            <div class="metric-card metric-card--${hc(agg.worstHealth)}"><div class="metric-card__value">${agg.worstHealth}</div><div class="metric-card__label">${t('aggWorstHealth')}</div></div>
            <div class="metric-card metric-card--${agg.totalIssues < 20 ? 'good' : agg.totalIssues < 100 ? 'warn' : 'bad'}"><div class="metric-card__value">${agg.totalIssues}</div><div class="metric-card__label">${t('aggTotalIssues')}</div></div>
        </div>`;

        // Comparison table
        html += `<div class="agg-table-wrap"><table class="agg-table">
            <thead><tr><th>${t('aggTableReport')}</th><th>${t('aggTableTps')}</th><th>${t('aggTableAvgTick')}</th><th>${t('aggTablePeak')}</th><th>${t('aggTableViolations')}</th><th>${t('aggTablePlayers')}</th><th>${t('aggTableHealth')}</th></tr></thead><tbody>`;
        reports.forEach((r, i) => {
            const a = r.analysis;
            html += `<tr>
                <td>${labels[i]}</td>
                <td class="${tpsCls(a.tps)}">${a.tps.toFixed(2)}</td>
                <td>${a.avgTickMs.toFixed(1)}ms</td>
                <td class="${a.peakTickMs > 300 ? 'val-bad' : a.peakTickMs > 100 ? 'val-warn' : 'val-good'}">${a.peakTickMs.toFixed(0)}ms</td>
                <td class="${a.totalViolations > 100 ? 'val-bad' : a.totalViolations > 10 ? 'val-warn' : 'val-good'}">${a.totalViolations}</td>
                <td>${a.avgPlayers.toFixed(1)}</td>
                <td class="${hc(a.health) === 'good' ? 'val-good' : hc(a.health) === 'warn' ? 'val-warn' : 'val-bad'}">${a.health}/100</td>
            </tr>`;
        });
        html += '</tbody></table></div>';

        // Recommendations
        html += `<div class="agg-recs"><div class="agg-recs__title">${t('aggRecsTitle')}</div>`;
        if (agg.recs.length === 0 && agg.commonIssues.length === 0) {
            html += `<div class="agg-rec-item"><div class="agg-rec-item__body">${t('aggNoIssues')}</div></div>`;
        } else {
            for (const rec of agg.recs) {
                html += `<div class="agg-rec-item agg-rec-item--${rec.severity}">
                    <div class="agg-rec-item__title">${rec.text}</div>
                    <div class="agg-rec-item__servers">${t('foundOn')}: ${rec.reports.map(i => labels[i]).join(', ')}</div>
                </div>`;
            }
            // Top common issues not covered by recs
            const recKeys = new Set(agg.recs.flatMap(r => [r.text]));
            for (const ci of agg.commonIssues.slice(0, 8)) {
                if (ci.reports.length < 2) continue;
                html += `<div class="agg-rec-item agg-rec-item--${ci.severity}">
                    <div class="agg-rec-item__title">${ci.title || t(ci.titleKey)} (${ci.reports.length}/${agg.count})</div>
                    <div class="agg-rec-item__body">${ci.recKey ? t(ci.recKey) : ''}</div>
                    <div class="agg-rec-item__servers">${t('foundOn')}: ${ci.reports.map(i => labels[i]).join(', ')}</div>
                </div>`;
            }
        }
        html += '</div>';
        el.innerHTML = html;
    }

    _reportHTML() {
        return `<section class="section"><h2 class="section__title" data-i18n="dashboard">${t('dashboard')}</h2>
            <div class="metrics-grid" data-el="mg"></div>
            <div class="health-bar-wrap"><div class="health-label" data-i18n="serverHealth">${t('serverHealth')}</div>
            <div class="health-bar"><div class="health-bar__fill" data-el="hf"></div></div>
            <div class="health-score" data-el="hs"></div></div></section>
            <section class="section"><h2 class="section__title" data-i18n="detectedIssues">${t('detectedIssues')} <span class="badge" data-el="ic"></span></h2><div data-el="il"></div></section>
            <section class="section" data-el="ws"><h2 class="section__title" data-i18n="worldLoad">${t('worldLoad')}</h2><div data-el="wc"></div></section>
            <section class="section" data-el="ps"><h2 class="section__title" data-i18n="pluginImpact">${t('pluginImpact')}</h2><div data-el="pl"></div></section>
            <section class="section"><h2 class="section__title" data-i18n="timingsTree">${t('timingsTree')}</h2>
            <div class="tree-controls"><button class="btn-sm" data-el="ea">${t('expandAll')}</button>
            <button class="btn-sm" data-el="ca">${t('collapseAll')}</button>
            <input type="text" class="tree-search" data-el="ts" placeholder="${t('filter')}"></div>
            <div class="tree-view" data-el="tv"></div></section>`;
    }

    _el(c, n) { return c.querySelector(`[data-el="${n}"]`); }

    _fillReport(c, parsed, a) {
        // Metrics
        const g = this._el(c, 'mg');
        const metrics = [
            { l: t('mTps'), v: a.tps.toFixed(2), c: a.tps >= 19.5 ? 'good' : a.tps >= 18 ? 'warn' : 'bad' },
            { l: t('mAvgTick'), v: `${a.avgTickMs.toFixed(1)}ms`, c: a.avgTickMs < 20 ? 'good' : a.avgTickMs < 40 ? 'warn' : 'bad' },
            { l: t('mPeakTick'), v: `${a.peakTickMs.toFixed(0)}ms`, c: a.peakTickMs < 100 ? 'good' : a.peakTickMs < 300 ? 'warn' : 'bad' },
            { l: t('mViolations'), v: a.totalViolations.toLocaleString(), c: a.totalViolations < 10 ? 'good' : a.totalViolations < 100 ? 'warn' : 'bad' },
            { l: t('mPlayers'), v: a.avgPlayers.toFixed(1), c: 'info' },
            { l: t('mEntities'), v: a.avgEntities.toFixed(0), c: 'info' },
            { l: t('mThreadLoad'), v: `${a.mainThreadLoad.toFixed(1)}%`, c: a.mainThreadLoad < 50 ? 'good' : a.mainThreadLoad < 80 ? 'warn' : 'bad' },
            { l: t('mSampleTime'), v: a.sampleTimeFormatted, c: 'info' },
        ];
        g.innerHTML = metrics.map(m => `<div class="metric-card metric-card--${m.c}"><div class="metric-card__value">${m.v}</div><div class="metric-card__label">${m.l}</div></div>`).join('');

        // Health
        const color = a.health >= 80 ? '#3fb950' : a.health >= 50 ? '#d29922' : '#f85149';
        this._el(c, 'hf').style.cssText = `width:${a.health}%;background:${color}`;
        const hs = this._el(c, 'hs'); hs.textContent = `${a.health}/100`; hs.style.color = color;

        // Issues
        this._el(c, 'ic').textContent = a.issues.length;
        const il = this._el(c, 'il');
        if (a.issues.length === 0) {
            il.innerHTML = `<div class="issue-card issue-card--info"><div class="issue-card__title">${t('noIssues')}</div></div>`;
        } else {
            il.innerHTML = a.issues.map(i => `<div class="issue-card issue-card--${i.severity}">
                <div class="issue-card__header"><span class="issue-card__severity issue-card__severity--${i.severity}">${i.severity}</span>
                <span class="issue-card__title">${i.title}</span></div>
                <div class="issue-card__body">${i.body}</div>
                <div>${i.metrics.map(m => `<span class="issue-card__metric">${m}</span> `).join('')}</div>
                ${i.recKey ? `<div class="issue-card__rec">\u2192 ${t(i.recKey)}</div>` : ''}
            </div>`).join('');
        }

        // Worlds
        const ws = this._el(c, 'ws'), wc = this._el(c, 'wc');
        if (a.worlds.length === 0) { ws.classList.add('hidden'); }
        else {
            ws.classList.remove('hidden');
            const mx = Math.max(...a.worlds.map(w => w.avgMs));
            wc.innerHTML = a.worlds.map(w => `<div class="world-row"><span class="world-row__name" title="${w.name}">${w.name}</span>
                <div class="world-row__bar-wrap"><div class="world-row__bar" style="width:${(w.avgMs / mx * 100).toFixed(1)}%"></div></div>
                <span class="world-row__value">${w.avgMs.toFixed(2)}ms (${w.pct.toFixed(1)}%)</span></div>`).join('');
        }

        // Plugins
        const ps = this._el(c, 'ps'), pl = this._el(c, 'pl');
        if (a.pluginImpact.length === 0) { ps.classList.add('hidden'); }
        else {
            ps.classList.remove('hidden');
            pl.innerHTML = a.pluginImpact.slice(0, 20).map((p, i) => `<div class="plugin-row">
                <span class="plugin-row__rank">${i + 1}</span><span class="plugin-row__name" title="${p.name}">${p.name}</span>
                <span class="plugin-row__time">${p.totalMs.toFixed(0)}ms${p.violations > 0 ? ` (${p.violations}v)` : ''}</span>
                <span class="plugin-row__pct">${p.pct.toFixed(1)}%</span></div>`).join('');
        }

        // Tree
        const tv = this._el(c, 'tv');
        const T = parsed.roots.find(n => n.name === 'Full Server Tick')?.time || 1;
        tv.innerHTML = this._tree(parsed.roots, T, 0);
        tv.onclick = e => { const tg = e.target.closest('.tree-node__toggle'); if (!tg || tg.classList.contains('leaf')) return;
            const ch = tg.closest('.tree-node').nextElementSibling;
            if (ch?.classList.contains('tree-children')) { ch.classList.toggle('open'); tg.classList.toggle('expanded'); } };

        // Tree controls
        this._el(c, 'ea').onclick = () => { tv.querySelectorAll('.tree-children').forEach(x => x.classList.add('open'));
            tv.querySelectorAll('.tree-node__toggle:not(.leaf)').forEach(x => x.classList.add('expanded')); };
        this._el(c, 'ca').onclick = () => { tv.querySelectorAll('.tree-children').forEach(x => x.classList.remove('open'));
            tv.querySelectorAll('.tree-node__toggle').forEach(x => x.classList.remove('expanded')); };
        let st; this._el(c, 'ts').oninput = e => { clearTimeout(st); st = setTimeout(() => {
            const q = e.target.value.toLowerCase().trim();
            tv.querySelectorAll('.tree-node').forEach(nd => { const nm = (nd.dataset.name || '').toLowerCase();
                if (!q) { nd.classList.remove('filtered-out', 'highlight'); }
                else if (nm.includes(q)) { nd.classList.remove('filtered-out'); nd.classList.add('highlight');
                    let p = nd.parentElement; while (p && p !== tv) { if (p.classList.contains('tree-children')) {
                        p.classList.add('open'); p.previousElementSibling?.querySelector('.tree-node__toggle')?.classList.add('expanded'); }
                        p = p.parentElement; } }
                else { nd.classList.add('filtered-out'); nd.classList.remove('highlight'); } });
        }, 200); };
    }

    _tree(nodes, T, d) {
        if (!nodes?.length) return '';
        return nodes.map(n => {
            const has = n.children?.length > 0, pct = (n.time / T) * 100, avg = n.avg / 1e6, pk = n.peak / 1e6;
            const ind = '\u00a0'.repeat(d * 2), tc = has ? '' : 'leaf', ao = d < 1 ? 'expanded' : '', co = d < 1 ? 'open' : '';
            let vh = n.violations > 0 ? ` <span class="tree-node__violations">[${n.violations}v]</span>` : '';
            return `<div class="tree-node" data-name="${this._ea(n.name)}">${ind}<button class="tree-node__toggle ${tc} ${ao}">\u25B6</button> ` +
                `<span class="tree-node__name">${this._e(n.name)}</span> <span class="tree-node__pct">${pct.toFixed(1)}%</span> ` +
                `<span class="tree-node__avg">${avg < 1 ? `${(n.avg / 1e3).toFixed(0)}\u00b5s` : `${avg.toFixed(1)}ms`}</span> ` +
                `<span class="tree-node__time">\u00d7${n.count.toLocaleString()}</span>${vh}` +
                (pk > 10 ? ` <span class="tree-node__peak">peak:${pk.toFixed(0)}ms</span>` : '') + `</div>` +
                (has ? `<div class="tree-children ${co}">${this._tree(n.children, T, d + 1)}</div>` : '');
        }).join('');
    }
    _e(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    _ea(s) { return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
}

// ─── CORS Fetch ─────────────────────────────────────────────

async function fetchTimings(url) {
    let raw = url.trim();
    if (raw.includes('timings.pmmp.io') && !raw.includes('raw=1'))
        raw += (raw.includes('?') ? '&' : '?') + 'raw=1';
    try { const r = await fetch(raw, { signal: AbortSignal.timeout(8000) });
        if (r.ok) { const t2 = await r.text(); if (t2.includes('Full Server Tick')) return t2; }
    } catch (_) {}
    const proxies = [
        u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
        u => `https://api.cors.lol/?url=${encodeURIComponent(u)}`,
    ];
    for (const mk of proxies) {
        try { const r = await fetch(mk(raw), { signal: AbortSignal.timeout(10000) });
            if (!r.ok) continue; const t2 = await r.text();
            if (t2.includes('Full Server Tick')) return t2;
        } catch (_) { continue; }
    }
    throw new Error('Could not fetch timings (CORS + all proxies failed). Open URL with &raw=1 in browser, copy text, paste here.');
}

// ─── Demo Data ──────────────────────────────────────────────

const DEMO = `Minecraft
    Full Server Tick Time: 8157000000 Count: 3200 Avg: 2549062.5 Violations: 15 RecordId: 100 ParentRecordId: none TimerId: 14 Ticks: 3200 Peak: 450000000
    Server Mid-Tick Processing Time: 1800000000 Count: 2800 Avg: 642857.14 Violations: 2 RecordId: 101 ParentRecordId: 100 TimerId: 16 Ticks: 3200 Peak: 200000000
        Snooze Handler: closure@pmsrc/src/network/mcpe/raklib/RakLibInterface#L104 Time: 1600000000 Count: 2600 Avg: 615384.61 Violations: 2 RecordId: 102 ParentRecordId: 101 TimerId: 179714 Ticks: 3100 Peak: 195000000
            Connection Handler Time: 1550000000 Count: 2600 Avg: 596153.84 Violations: 2 RecordId: 103 ParentRecordId: 102 TimerId: 20 Ticks: 3100 Peak: 194000000
                Player Network Receive Time: 1400000000 Count: 8000 Avg: 175000.0 Violations: 2 RecordId: 104 ParentRecordId: 103 TimerId: 28 Ticks: 3100 Peak: 180000000
                    Receive - PlayerAuthInputPacket Time: 1000000000 Count: 7800 Avg: 128205.12 Violations: 1 RecordId: 106 ParentRecordId: 104 TimerId: 854926 Ticks: 3100 Peak: 60000000
    Server Tick Update Cycle Time: 6300000000 Count: 3200 Avg: 1968750.0 Violations: 10 RecordId: 200 ParentRecordId: 100 TimerId: 15 Ticks: 3200 Peak: 440000000
        Worlds - World Tick Time: 5000000000 Count: 6400 Avg: 781250.0 Violations: 5 RecordId: 300 ParentRecordId: 200 TimerId: 85079 Ticks: 3200 Peak: 45000000
            world - World Tick Time: 3200000000 Count: 3200 Avg: 1000000.0 Violations: 3 RecordId: 301 ParentRecordId: 300 TimerId: 85080 Ticks: 3200 Peak: 45000000
                Worlds - Entity Tick Time: 1200000000 Count: 3200 Avg: 375000.0 Violations: 0 RecordId: 302 ParentRecordId: 301 TimerId: 85075 Ticks: 3200 Peak: 20000000
                    world - Entity Tick Time: 1200000000 Count: 3200 Avg: 375000.0 Violations: 0 RecordId: 303 ParentRecordId: 302 TimerId: 85076 Ticks: 3200 Peak: 20000000
                        Entity Tick - Player Time: 800000000 Count: 12000 Avg: 66666.66 Violations: 0 RecordId: 304 ParentRecordId: 303 TimerId: 804565 Ticks: 3200 Peak: 15000000
                        Entity Tick - phpcube\\entity\\type\\TenguBoss Time: 250000000 Count: 4000 Avg: 62500.0 Violations: 0 RecordId: 306 ParentRecordId: 303 TimerId: 930315 Ticks: 2000 Peak: 8000000
                Worlds - Random Chunk Updates Time: 1400000000 Count: 3200 Avg: 437500.0 Violations: 0 RecordId: 307 ParentRecordId: 301 TimerId: 85069 Ticks: 3200 Peak: 35000000
            spawn - World Tick Time: 1600000000 Count: 3200 Avg: 500000.0 Violations: 2 RecordId: 312 ParentRecordId: 300 TimerId: 85293 Ticks: 3200 Peak: 20000000
        Memory Manager Time: 400000000 Count: 3200 Avg: 125000.0 Violations: 4 RecordId: 500 ParentRecordId: 200 TimerId: 17 Ticks: 3200 Peak: 390000000
            Cyclic Garbage Collector Time: 380000000 Count: 2 Avg: 190000000.0 Violations: 4 RecordId: 501 ParentRecordId: 500 TimerId: 74 Ticks: 2 Peak: 380000000
Guardian v1.3.3
    veroxcode\\Guardian\\Listener\\EventListener->onPacketReceive(DataPacketReceiveEvent) Time: 400000000 Count: 8000 Avg: 50000.0 Violations: 0 RecordId: 600 ParentRecordId: 106 TimerId: 86781 Ticks: 3100 Peak: 5000000
CubeTop v1.0.0
    Task: phpcube\\task\\CubeHologramTask(interval:20) Time: 50000000 Count: 160 Avg: 312500.0 Violations: 1 RecordId: 700 ParentRecordId: 200 TimerId: 203911 Ticks: 160 Peak: 82000000
# Version v26.0
# Obsidian Engine 5.41.2+dev
Sample time 163000000000 (163.0s)`;

// ─── App Init ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const parser = new TimingsParser();
    const analyzer = new TimingsAnalyzer();
    const ui = new TimingsUI();
    let pendingFiles = [];

    // i18n
    function applyLang() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (I18N[currentLang][key]) el.innerHTML = I18N[currentLang][key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            if (I18N[currentLang][key]) el.placeholder = I18N[currentLang][key];
        });
        const btn = document.getElementById('lang-toggle');
        btn.textContent = currentLang === 'en' ? 'RU' : 'EN';
        btn.classList.toggle('active-ru', currentLang === 'ru');
    }
    document.getElementById('lang-toggle').addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'ru' : 'en';
        localStorage.setItem('pmmp-lang', currentLang);
        applyLang();
    });
    applyLang();

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t2 => t2.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });

    // File drop
    const drop = document.getElementById('file-drop'), fi = document.getElementById('timings-file');
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('dragover')));
    drop.addEventListener('drop', e => { e.preventDefault(); handleFiles(Array.from(e.dataTransfer.files)); });
    fi.addEventListener('change', () => { if (fi.files.length) handleFiles(Array.from(fi.files)); });
    function handleFiles(files) {
        pendingFiles = files.filter(f => f.size > 0);
        drop.querySelector('.file-drop__text').textContent =
            pendingFiles.length === 1 ? `Loaded: ${pendingFiles[0].name}` : `${pendingFiles.length} files loaded`;
    }

    // Analyze
    const btn = document.getElementById('btn-analyze');
    btn.addEventListener('click', async () => {
        btn.classList.add('loading'); btn.disabled = true; clearError();
        try {
            const tab = document.querySelector('.tab.active').dataset.tab;
            let texts = [], labels = [];

            if (tab === 'paste') {
                const val = document.getElementById('timings-text').value.trim();
                if (!val) throw new Error('No timings data provided.');
                const parts = val.split(/\n\s*===\s*\n/).map(t2 => t2.trim()).filter(Boolean);
                texts = parts;
                labels = parts.length === 1 ? ['Report 1'] : parts.map((_, i) => `Report ${i + 1}`);
            } else if (tab === 'url') {
                const urlVal = document.getElementById('timings-url').value.trim();
                if (!urlVal) throw new Error('Please enter a URL');
                const urls = urlVal.split('\n').map(u => u.trim()).filter(Boolean);
                for (let i = 0; i < urls.length; i++) {
                    btn.textContent = urls.length > 1 ? `${t('fetching')} ${i + 1}/${urls.length}...` : `${t('fetching')}...`;
                    texts.push(await fetchTimings(urls[i]));
                }
                labels = urls.map((_, i) => `URL ${i + 1}`);
                btn.textContent = t('btnAnalyze');
            } else if (tab === 'file') {
                if (!pendingFiles.length) throw new Error('No files selected.');
                for (const f of pendingFiles) texts.push(await readFile(f));
                labels = pendingFiles.map(f => f.name.replace(/\.[^.]+$/, ''));
            }
            if (!texts.length) throw new Error('No timings data.');
            for (let i = 0; i < texts.length; i++)
                if (!texts[i].includes('Full Server Tick Time'))
                    throw new Error(texts.length > 1 ? `${labels[i]}: Invalid format. Use raw timings (&raw=1).` : 'Invalid format. Use raw timings (&raw=1).');

            await new Promise(r => setTimeout(r, 50));
            const reports = texts.map(tx => { const p = parser.parse(tx); return { parsed: p, analysis: analyzer.analyze(p) }; });

            // Try to extract better labels from meta
            reports.forEach((r, i) => {
                const v = r.analysis.meta.version;
                if (v && labels[i].startsWith('Report ')) labels[i] = `Report ${i + 1} (${v})`;
            });

            ui.renderMultiple(reports, labels);
        } catch (err) { showError(err.message); }
        finally { btn.classList.remove('loading'); btn.disabled = false; btn.textContent = t('btnAnalyze'); }
    });

    // Demo
    document.getElementById('btn-demo').addEventListener('click', () => {
        document.getElementById('timings-text').value = DEMO;
        document.querySelectorAll('.tab').forEach(t2 => t2.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelector('[data-tab="paste"]').classList.add('active');
        document.getElementById('tab-paste').classList.add('active');
        btn.click();
    });

    // New analysis
    document.getElementById('btn-new').addEventListener('click', () => {
        document.getElementById('results').classList.add('hidden');
        const hero = document.getElementById('hero');
        hero.style.minHeight = '50vh'; hero.style.paddingTop = ''; hero.style.paddingBottom = '';
        document.getElementById('timings-text').value = '';
        document.getElementById('timings-url').value = '';
        pendingFiles = [];
        const ft = document.querySelector('.file-drop__text');
        if (ft) ft.textContent = t('fileDrop');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    function readFile(f) { return new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error(`Read failed: ${f.name}`)); r.readAsText(f); }); }
    function showError(msg) { clearError(); const e = document.createElement('div'); e.className = 'error-msg'; e.textContent = msg; document.querySelector('.input-group').appendChild(e); }
    function clearError() { document.querySelectorAll('.error-msg').forEach(e => e.remove()); }
});
