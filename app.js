'use strict';

/* ============================================================
   PocketMine Timings Analyzer
   Parser → Analyzer → UI
   ============================================================ */

// ─── Parser ─────────────────────────────────────────────────

class TimingsParser {
    parse(raw) {
        const lines = raw.split('\n');
        const nodes = [];
        const nodeMap = {};
        let meta = { version: '', engine: '', formatVersion: '', sampleTime: 0, sampleTimeStr: '' };
        const plugins = {};
        let currentPlugin = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            // Footer metadata
            if (line.startsWith('# Version ')) { meta.version = line.slice(10).trim(); continue; }
            if (line.startsWith('# Obsidian Engine ')) { meta.engine = line.slice(18).trim(); continue; }
            if (line.startsWith('# FormatVersion ')) { meta.formatVersion = line.slice(16).trim(); continue; }
            if (line.startsWith('Sample time ')) {
                const m = line.match(/Sample time (\d+)\s*\(([^)]+)\)/);
                if (m) { meta.sampleTime = parseInt(m[1]); meta.sampleTimeStr = m[2]; }
                continue;
            }

            // Root marker
            if (line === 'Minecraft' || line.match(/^Minecraft ThreadId: \d+/)) {
                currentPlugin = null;
                continue;
            }

            // Plugin header: "PluginName vX.Y.Z" (no indent, no Time: field)
            if (!line.startsWith(' ') && !line.includes(' Time: ') && line.match(/^[\w\\]+\s+v[\d.]+/)) {
                currentPlugin = line.trim();
                if (!plugins[currentPlugin]) plugins[currentPlugin] = [];
                continue;
            }

            // Timing entry
            const entry = this._parseLine(line);
            if (!entry) continue;

            entry.plugin = currentPlugin;
            entry.children = [];
            nodes.push(entry);
            nodeMap[entry.recordId] = entry;

            if (currentPlugin) {
                plugins[currentPlugin].push(entry);
            }
        }

        // Build tree
        const roots = [];
        for (const node of nodes) {
            if (node.parentRecordId && nodeMap[node.parentRecordId]) {
                nodeMap[node.parentRecordId].children.push(node);
            } else {
                roots.push(node);
            }
        }

        return { nodes, roots, meta, plugins, nodeMap };
    }

    _parseLine(line) {
        // Measure indent (4 spaces per level)
        const indent = line.search(/\S/);
        if (indent < 0) return null;
        const depth = Math.floor(indent / 4);
        const content = line.trim();

        // Decode HTML entities
        const decoded = content.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

        // Parse fields
        const timeMatch = decoded.match(/^(.+?)\s+Time:\s*(\d+)\s+Count:\s*(\d+)\s+Avg:\s*([\d.]+)\s+Violations:\s*(\d+)\s+RecordId:\s*(\d+)\s+ParentRecordId:\s*(\d+|none)\s+TimerId:\s*(\d+)\s+Ticks:\s*(\d+)\s+Peak:\s*(\d+)/);
        if (!timeMatch) return null;

        return {
            name: timeMatch[1].trim(),
            time: parseInt(timeMatch[2]),
            count: parseInt(timeMatch[3]),
            avg: parseFloat(timeMatch[4]),
            violations: parseInt(timeMatch[5]),
            recordId: timeMatch[6],
            parentRecordId: timeMatch[7] === 'none' ? null : timeMatch[7],
            timerId: timeMatch[8],
            ticks: parseInt(timeMatch[9]),
            peak: parseInt(timeMatch[10]),
            depth,
            children: [],
            plugin: null,
        };
    }
}

// ─── Analyzer ───────────────────────────────────────────────

class TimingsAnalyzer {
    analyze(parsed) {
        const { nodes, roots, meta, plugins } = parsed;

        // Find key entries
        const fullTick = nodes.find(n => n.name === 'Full Server Tick Time');
        const updateCycle = nodes.find(n => n.name === 'Server Tick Update Cycle');
        const gcNode = nodes.find(n => n.name === 'Cyclic Garbage Collector');
        const memMgr = nodes.find(n => n.name === 'Memory Manager Time');

        const totalTickNs = fullTick ? fullTick.time : 1;
        const ticks = fullTick ? fullTick.ticks : 1;
        const avgTickNs = fullTick ? fullTick.avg : 0;
        const avgTickMs = avgTickNs / 1_000_000;
        const peakTickMs = fullTick ? fullTick.peak / 1_000_000 : 0;
        const totalViolations = fullTick ? fullTick.violations : 0;

        // TPS
        let tps = 20;
        if (meta.sampleTime > 0) {
            tps = Math.min(20, ticks / (meta.sampleTime / 1_000_000_000));
        } else if (avgTickMs > 50) {
            tps = 1000 / avgTickMs;
        }

        // Main thread load
        const sampleTimeNs = meta.sampleTime || (ticks * 50_000_000);
        const mainThreadLoad = (totalTickNs / sampleTimeNs) * 100;

        // Average players & entities
        const playerTicks = nodes.filter(n => n.name === 'Entity Tick - Player');
        const avgPlayers = playerTicks.reduce((s, n) => s + n.count, 0) / Math.max(1, ticks);
        const allEntityTicks = nodes.filter(n => n.name.startsWith('Entity Tick - '));
        const avgEntities = allEntityTicks.reduce((s, n) => s + n.count, 0) / Math.max(1, ticks);

        // Sample time formatted
        const sampleTimeSec = meta.sampleTime ? meta.sampleTime / 1_000_000_000 : ticks * 0.05;
        const sampleTimeFormatted = sampleTimeSec > 60
            ? `${(sampleTimeSec / 60).toFixed(1)} min`
            : `${sampleTimeSec.toFixed(1)}s`;

        // World breakdown
        const worlds = this._analyzeWorlds(nodes, totalTickNs);

        // Plugin impact
        const pluginImpact = this._analyzePlugins(plugins, totalTickNs);

        // Issues
        const issues = this._detectIssues(nodes, fullTick, gcNode, totalTickNs, ticks, avgTickMs);

        // Health score (0-100)
        const health = this._calcHealth(tps, avgTickMs, peakTickMs, totalViolations, ticks, issues);

        return {
            tps: Math.round(tps * 100) / 100,
            avgTickMs: Math.round(avgTickMs * 100) / 100,
            peakTickMs: Math.round(peakTickMs * 100) / 100,
            totalViolations,
            avgPlayers: Math.round(avgPlayers * 10) / 10,
            avgEntities: Math.round(avgEntities * 10) / 10,
            mainThreadLoad: Math.round(mainThreadLoad * 10) / 10,
            sampleTimeFormatted,
            ticks,
            worlds,
            pluginImpact,
            issues,
            health,
            meta,
        };
    }

    _analyzeWorlds(nodes, totalTickNs) {
        const worldTicks = nodes.filter(n =>
            n.name.match(/^\w[\w\d_]+ - World Tick$/) && n.name !== 'Worlds - World Tick'
        );
        return worldTicks
            .map(w => ({
                name: w.name.replace(' - World Tick', ''),
                avgMs: w.avg / 1_000_000,
                totalMs: w.time / 1_000_000,
                pct: (w.time / totalTickNs) * 100,
                peakMs: w.peak / 1_000_000,
                violations: w.violations,
            }))
            .sort((a, b) => b.totalMs - a.totalMs);
    }

    _analyzePlugins(plugins, totalTickNs) {
        const results = [];
        for (const [name, entries] of Object.entries(plugins)) {
            const totalTime = entries.reduce((s, e) => s + e.time, 0);
            const totalViolations = entries.reduce((s, e) => s + e.violations, 0);
            const peakEntry = entries.reduce((best, e) => e.peak > best.peak ? e : best, entries[0]);
            results.push({
                name,
                totalMs: totalTime / 1_000_000,
                pct: (totalTime / totalTickNs) * 100,
                violations: totalViolations,
                peakMs: peakEntry ? peakEntry.peak / 1_000_000 : 0,
                peakName: peakEntry ? peakEntry.name : '',
                entryCount: entries.length,
            });
        }
        return results.sort((a, b) => b.totalMs - a.totalMs);
    }

    _detectIssues(nodes, fullTick, gcNode, totalTickNs, ticks, avgTickMs) {
        const issues = [];

        // 1. GC spikes
        if (gcNode && gcNode.avg > 50_000_000) {
            const avgMs = gcNode.avg / 1_000_000;
            const peakMs = gcNode.peak / 1_000_000;
            issues.push({
                severity: peakMs > 200 ? 'critical' : 'warning',
                title: 'Garbage Collector Freezes',
                body: `GC ran <strong>${gcNode.count}</strong> times, averaging <strong>${avgMs.toFixed(0)}ms</strong> per run with peak <strong>${peakMs.toFixed(0)}ms</strong>. ` +
                    `This caused <strong>${gcNode.violations}</strong> violations — every GC pass freezes the main thread.`,
                metrics: [`avg: ${avgMs.toFixed(0)}ms`, `peak: ${peakMs.toFixed(0)}ms`, `runs: ${gcNode.count}`],
                rec: 'Consider gc_disable() + manual gc_collect_cycles() during low-activity periods (e.g., end of tick when idle). This is a known PHP limitation without JIT.',
            });
        }

        // 2. ModalForm lag
        const formHandler = nodes.find(n => n.name.includes('Handler - ModalFormResponsePacket'));
        if (formHandler && (formHandler.avg > 1_000_000 || formHandler.violations > 0)) {
            const avgMs = formHandler.avg / 1_000_000;
            const peakMs = formHandler.peak / 1_000_000;
            issues.push({
                severity: peakMs > 100 ? 'critical' : 'warning',
                title: 'Slow Form Handler Callbacks',
                body: `ModalFormResponsePacket handler averages <strong>${avgMs.toFixed(1)}ms</strong> per call (peak <strong>${peakMs.toFixed(0)}ms</strong>, ${formHandler.violations} violations). ` +
                    `A form callback is doing heavy synchronous work (file I/O, large loops, or chunk loading).`,
                metrics: [`avg: ${avgMs.toFixed(1)}ms`, `peak: ${peakMs.toFixed(0)}ms`, `calls: ${formHandler.count}`],
                rec: 'Profile which plugin\'s form callback causes this. Move heavy operations to async tasks. Common culprits: database queries, inventory operations, or chunk teleportation inside form callbacks.',
            });
        }

        // 3. Entity bottlenecks
        const entityEntries = nodes.filter(n =>
            n.name.startsWith('Entity Tick - ') && !n.name.includes('Player') && !n.name.includes('ItemEntity')
        );
        for (const e of entityEntries) {
            const pct = (e.time / totalTickNs) * 100;
            if (pct > 3 || e.avg > 200_000) {
                const avgUs = e.avg / 1_000;
                issues.push({
                    severity: pct > 8 ? 'critical' : 'warning',
                    title: `Heavy Entity: ${e.name.replace('Entity Tick - ', '')}`,
                    body: `Takes <strong>${pct.toFixed(1)}%</strong> of tick time (${avgUs.toFixed(0)}\u00b5s avg, ${e.count} ticks). ` +
                        `Peak: <strong>${(e.peak / 1_000_000).toFixed(1)}ms</strong>.`,
                    metrics: [`${pct.toFixed(1)}% of tick`, `avg: ${avgUs.toFixed(0)}\u00b5s`, `count: ${e.count}`],
                    rec: 'Check if this entity broadcasts packets every tick unnecessarily. Consider reducing update frequency or limiting entity count.',
                });
            }
        }

        // 4. Heavy scheduled tasks
        const tasks = nodes.filter(n => n.name.startsWith('Task: '));
        for (const t of tasks) {
            if (t.avg > 500_000 || t.violations > 0) {
                const avgMs = t.avg / 1_000_000;
                const peakMs = t.peak / 1_000_000;
                issues.push({
                    severity: t.violations > 5 ? 'critical' : (t.violations > 0 ? 'warning' : 'info'),
                    title: `Slow Task: ${this._shortName(t.name)}`,
                    body: `Averages <strong>${avgMs.toFixed(1)}ms</strong> per run, peak <strong>${peakMs.toFixed(0)}ms</strong>. ` +
                        `${t.violations} violations over ${t.count} runs.`,
                    metrics: [`avg: ${avgMs.toFixed(1)}ms`, `peak: ${peakMs.toFixed(0)}ms`, `violations: ${t.violations}`],
                    rec: 'Profile this task. If it does heavy I/O or computation, consider splitting across multiple ticks or moving to an AsyncTask.',
                });
            }
        }

        // 5. Network overhead
        const netRecv = nodes.find(n => n.name === 'Player Network Receive Time' && !n.parentRecordId);
        const netRecvMain = nodes.filter(n => n.name === 'Player Network Receive Time');
        const totalNetRecv = netRecvMain.reduce((s, n) => s + n.time, 0);
        const netPct = (totalNetRecv / totalTickNs) * 100;
        if (netPct > 25) {
            issues.push({
                severity: netPct > 40 ? 'warning' : 'info',
                title: 'High Network Receive Overhead',
                body: `Network packet processing takes <strong>${netPct.toFixed(1)}%</strong> of tick time. ` +
                    `This is usually caused by many players or plugins with heavy packet handlers.`,
                metrics: [`${netPct.toFixed(1)}% of tick`],
                rec: 'Check DataPacketReceiveEvent handlers. Anticheats and packet-heavy plugins are common culprits.',
            });
        }

        // 6. Chunk loading on main thread
        const chunkLoads = nodes.filter(n => n.name.match(/- Chunk Load$/));
        const totalChunkMs = chunkLoads.reduce((s, n) => s + n.time, 0) / 1_000_000;
        const chunkPct = (chunkLoads.reduce((s, n) => s + n.time, 0) / totalTickNs) * 100;
        if (chunkPct > 5) {
            issues.push({
                severity: chunkPct > 15 ? 'warning' : 'info',
                title: 'Chunk Loading Overhead',
                body: `Chunk loading took <strong>${totalChunkMs.toFixed(0)}ms</strong> total (<strong>${chunkPct.toFixed(1)}%</strong> of tick time). ` +
                    `Heavy chunk loading usually means players are moving fast or teleporting often.`,
                metrics: [`${chunkPct.toFixed(1)}% of tick`, `total: ${totalChunkMs.toFixed(0)}ms`],
                rec: 'Consider pre-generating chunks in frequently visited areas. Reduce view distance if needed.',
            });
        }

        // 7. Random chunk updates
        const randomUpdates = nodes.filter(n => n.name.match(/^\w[\w\d_]+ - Random Chunk Updates$/));
        const totalRandomMs = randomUpdates.reduce((s, n) => s + n.time, 0) / 1_000_000;
        const randomPct = (randomUpdates.reduce((s, n) => s + n.time, 0) / totalTickNs) * 100;
        if (randomPct > 10) {
            issues.push({
                severity: randomPct > 20 ? 'warning' : 'info',
                title: 'Heavy Random Chunk Updates',
                body: `Random tick updates take <strong>${randomPct.toFixed(1)}%</strong> of tick time across all worlds. ` +
                    `This is normal for survival servers but can be reduced if needed.`,
                metrics: [`${randomPct.toFixed(1)}% of tick`],
                rec: 'Reduce random-tick-speed in pocketmine.yml or unload unused worlds.',
            });
        }

        // 8. High violations entries (top 5 non-root)
        const highViolations = nodes
            .filter(n => n.violations > 3 && n.name !== 'Full Server Tick Time' && n.name !== 'Server Tick Update Cycle' && n.name !== 'Server Mid-Tick Processing Time')
            .sort((a, b) => b.violations - a.violations)
            .slice(0, 5);

        for (const entry of highViolations) {
            // Skip if already reported
            if (issues.some(i => i.title.includes(this._shortName(entry.name)))) continue;
            if (entry.name === 'Cyclic Garbage Collector' || entry.name === 'Memory Manager Time') continue;
            if (entry.name.includes('Connection Handler') || entry.name.includes('Player Network')) continue;
            if (entry.name.match(/^Worlds? -/)) continue;

            const avgMs = entry.avg / 1_000_000;
            const peakMs = entry.peak / 1_000_000;
            issues.push({
                severity: entry.violations > 20 ? 'warning' : 'info',
                title: `High Violations: ${this._shortName(entry.name)}`,
                body: `<strong>${entry.violations}</strong> violations (avg <strong>${avgMs.toFixed(1)}ms</strong>, peak <strong>${peakMs.toFixed(0)}ms</strong>).`,
                metrics: [`violations: ${entry.violations}`, `avg: ${avgMs.toFixed(1)}ms`, `peak: ${peakMs.toFixed(0)}ms`],
                rec: 'Investigate what causes spikes in this operation.',
            });
        }

        // Sort by severity
        const order = { critical: 0, warning: 1, info: 2 };
        issues.sort((a, b) => order[a.severity] - order[b.severity]);
        return issues;
    }

    _shortName(name) {
        // Shorten long namespaces
        return name
            .replace(/^Task:\s*/, '')
            .replace(/.*\\([^\\]+)$/, '$1')
            .replace(/\(interval:\d+\)/, '')
            .replace(/\(Single\)/, '');
    }

    _calcHealth(tps, avgTickMs, peakTickMs, violations, ticks, issues) {
        let score = 100;

        // TPS impact (0-30 points)
        if (tps < 19.5) score -= Math.min(30, (20 - tps) * 15);

        // Avg tick impact (0-20 points)
        if (avgTickMs > 10) score -= Math.min(20, (avgTickMs - 10) * 0.5);

        // Violations rate (0-20 points)
        const violationRate = violations / Math.max(1, ticks);
        if (violationRate > 0.01) score -= Math.min(20, violationRate * 500);

        // Peak impact (0-15 points)
        if (peakTickMs > 100) score -= Math.min(15, (peakTickMs - 100) / 50);

        // Critical issues (0-15 points)
        const criticals = issues.filter(i => i.severity === 'critical').length;
        score -= Math.min(15, criticals * 5);

        return Math.max(0, Math.min(100, Math.round(score)));
    }
}

// ─── UI ─────────────────────────────────────────────────────

class TimingsUI {
    constructor() {
        this.parsed = null;
        this.analysis = null;
    }

    render(parsed, analysis) {
        this.parsed = parsed;
        this.analysis = analysis;

        this._renderMetrics(analysis);
        this._renderHealth(analysis.health);
        this._renderIssues(analysis.issues);
        this._renderWorlds(analysis.worlds);
        this._renderPlugins(analysis.pluginImpact);
        this._renderTree(parsed.roots, analysis);

        document.getElementById('results').classList.remove('hidden');
        document.getElementById('hero').style.minHeight = 'auto';
        document.getElementById('hero').style.paddingTop = '20px';
        document.getElementById('hero').style.paddingBottom = '16px';

        // Scroll to results
        setTimeout(() => {
            document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    _renderMetrics(a) {
        const grid = document.getElementById('metrics-grid');
        const metrics = [
            { label: 'TPS', value: a.tps.toFixed(2), cls: a.tps >= 19.5 ? 'good' : a.tps >= 18 ? 'warn' : 'bad' },
            { label: 'Avg Tick', value: `${a.avgTickMs.toFixed(1)}ms`, cls: a.avgTickMs < 20 ? 'good' : a.avgTickMs < 40 ? 'warn' : 'bad' },
            { label: 'Peak Tick', value: `${a.peakTickMs.toFixed(0)}ms`, cls: a.peakTickMs < 100 ? 'good' : a.peakTickMs < 300 ? 'warn' : 'bad' },
            { label: 'Violations', value: a.totalViolations.toLocaleString(), cls: a.totalViolations < 10 ? 'good' : a.totalViolations < 100 ? 'warn' : 'bad' },
            { label: 'Avg Players', value: a.avgPlayers.toFixed(1), cls: 'info' },
            { label: 'Avg Entities', value: a.avgEntities.toFixed(0), cls: 'info' },
            { label: 'Thread Load', value: `${a.mainThreadLoad.toFixed(1)}%`, cls: a.mainThreadLoad < 50 ? 'good' : a.mainThreadLoad < 80 ? 'warn' : 'bad' },
            { label: 'Sample Time', value: a.sampleTimeFormatted, cls: 'info' },
        ];

        grid.innerHTML = metrics.map(m => `
            <div class="metric-card metric-card--${m.cls}">
                <div class="metric-card__value">${m.value}</div>
                <div class="metric-card__label">${m.label}</div>
            </div>
        `).join('');
    }

    _renderHealth(score) {
        const fill = document.getElementById('health-fill');
        const scoreEl = document.getElementById('health-score');
        const color = score >= 80 ? '#3fb950' : score >= 50 ? '#d29922' : '#f85149';

        fill.style.width = `${score}%`;
        fill.style.background = color;
        scoreEl.textContent = `${score}/100`;
        scoreEl.style.color = color;
    }

    _renderIssues(issues) {
        const list = document.getElementById('issues-list');
        const countBadge = document.getElementById('issues-count');
        countBadge.textContent = issues.length;

        if (issues.length === 0) {
            list.innerHTML = '<div class="issue-card issue-card--info"><div class="issue-card__title">No issues detected! Your server is running great.</div></div>';
            return;
        }

        list.innerHTML = issues.map(i => `
            <div class="issue-card issue-card--${i.severity}">
                <div class="issue-card__header">
                    <span class="issue-card__severity issue-card__severity--${i.severity}">${i.severity}</span>
                    <span class="issue-card__title">${i.title}</span>
                </div>
                <div class="issue-card__body">${i.body}</div>
                <div>${i.metrics.map(m => `<span class="issue-card__metric">${m}</span> `).join('')}</div>
                ${i.rec ? `<div class="issue-card__rec">\u2192 ${i.rec}</div>` : ''}
            </div>
        `).join('');
    }

    _renderWorlds(worlds) {
        const chart = document.getElementById('worlds-chart');
        const section = document.getElementById('worlds-section');

        if (worlds.length === 0) { section.classList.add('hidden'); return; }
        section.classList.remove('hidden');

        const maxMs = Math.max(...worlds.map(w => w.avgMs));

        chart.innerHTML = worlds.map(w => `
            <div class="world-row">
                <span class="world-row__name" title="${w.name}">${w.name}</span>
                <div class="world-row__bar-wrap">
                    <div class="world-row__bar" style="width:${(w.avgMs / maxMs * 100).toFixed(1)}%"></div>
                </div>
                <span class="world-row__value">${w.avgMs.toFixed(2)}ms (${w.pct.toFixed(1)}%)</span>
            </div>
        `).join('');
    }

    _renderPlugins(plugins) {
        const list = document.getElementById('plugins-list');
        const section = document.getElementById('plugins-section');

        if (plugins.length === 0) { section.classList.add('hidden'); return; }
        section.classList.remove('hidden');

        // Show top 20
        list.innerHTML = plugins.slice(0, 20).map((p, i) => `
            <div class="plugin-row">
                <span class="plugin-row__rank">${i + 1}</span>
                <span class="plugin-row__name" title="${p.name}">${p.name}</span>
                <span class="plugin-row__time">${p.totalMs.toFixed(0)}ms${p.violations > 0 ? ` (${p.violations}v)` : ''}</span>
                <span class="plugin-row__pct">${p.pct.toFixed(1)}%</span>
            </div>
        `).join('');
    }

    _renderTree(roots, analysis) {
        const view = document.getElementById('tree-view');
        const totalTickNs = roots.find(n => n.name === 'Full Server Tick Time')?.time || 1;

        const html = this._buildTreeHTML(roots, totalTickNs, 0);
        view.innerHTML = html;

        // Event delegation for toggle
        view.addEventListener('click', (e) => {
            const toggle = e.target.closest('.tree-node__toggle');
            if (!toggle || toggle.classList.contains('leaf')) return;

            const children = toggle.closest('.tree-node').nextElementSibling;
            if (children && children.classList.contains('tree-children')) {
                children.classList.toggle('open');
                toggle.classList.toggle('expanded');
            }
        });
    }

    _buildTreeHTML(nodes, totalTickNs, depth) {
        if (!nodes || nodes.length === 0) return '';

        return nodes.map(node => {
            const hasChildren = node.children && node.children.length > 0;
            const pct = ((node.time / totalTickNs) * 100);
            const avgMs = node.avg / 1_000_000;
            const peakMs = node.peak / 1_000_000;

            const indent = '\u00a0'.repeat(depth * 2);
            const toggleClass = hasChildren ? '' : 'leaf';
            const autoOpen = depth < 1 ? 'expanded' : '';
            const childrenOpen = depth < 1 ? 'open' : '';

            let violationHtml = '';
            if (node.violations > 0) {
                violationHtml = ` <span class="tree-node__violations">[${node.violations}v]</span>`;
            }

            const line = `<div class="tree-node" data-name="${this._escAttr(node.name)}">` +
                `${indent}<button class="tree-node__toggle ${toggleClass} ${autoOpen}" aria-label="Toggle">\u25B6</button> ` +
                `<span class="tree-node__name">${this._esc(node.name)}</span> ` +
                `<span class="tree-node__pct">${pct.toFixed(1)}%</span> ` +
                `<span class="tree-node__avg">${avgMs < 1 ? `${(node.avg / 1000).toFixed(0)}\u00b5s` : `${avgMs.toFixed(1)}ms`}</span> ` +
                `<span class="tree-node__time">\u00d7${node.count.toLocaleString()}</span>` +
                violationHtml +
                (peakMs > 10 ? ` <span class="tree-node__peak">peak:${peakMs.toFixed(0)}ms</span>` : '') +
                `</div>`;

            const childrenHtml = hasChildren
                ? `<div class="tree-children ${childrenOpen}">${this._buildTreeHTML(node.children, totalTickNs, depth + 1)}</div>`
                : '';

            return line + childrenHtml;
        }).join('');
    }

    _esc(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    _escAttr(s) {
        return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

// ─── Demo Data ──────────────────────────────────────────────

const DEMO_TIMINGS = `Minecraft
    Full Server Tick Time: 8157000000 Count: 3200 Avg: 2549062.5 Violations: 15 RecordId: 100 ParentRecordId: none TimerId: 14 Ticks: 3200 Peak: 450000000
    Server Mid-Tick Processing Time: 1800000000 Count: 2800 Avg: 642857.14 Violations: 2 RecordId: 101 ParentRecordId: 100 TimerId: 16 Ticks: 3200 Peak: 200000000
        Snooze Handler: closure@pmsrc/src/network/mcpe/raklib/RakLibInterface#L104 Time: 1600000000 Count: 2600 Avg: 615384.61 Violations: 2 RecordId: 102 ParentRecordId: 101 TimerId: 179714 Ticks: 3100 Peak: 195000000
            Connection Handler Time: 1550000000 Count: 2600 Avg: 596153.84 Violations: 2 RecordId: 103 ParentRecordId: 102 TimerId: 20 Ticks: 3100 Peak: 194000000
                Player Network Receive Time: 1400000000 Count: 8000 Avg: 175000.0 Violations: 2 RecordId: 104 ParentRecordId: 103 TimerId: 28 Ticks: 3100 Peak: 180000000
                    Player Network Receive - Decryption Time: 60000000 Count: 8000 Avg: 7500.0 Violations: 0 RecordId: 105 ParentRecordId: 104 TimerId: 30 Ticks: 3100 Peak: 50000
                    Receive - PlayerAuthInputPacket Time: 1000000000 Count: 7800 Avg: 128205.12 Violations: 1 RecordId: 106 ParentRecordId: 104 TimerId: 854926 Ticks: 3100 Peak: 60000000
                        Decode - PlayerAuthInputPacket Time: 50000000 Count: 7800 Avg: 6410.25 Violations: 0 RecordId: 107 ParentRecordId: 106 TimerId: 826642 Ticks: 3100 Peak: 50000
                        Handler - PlayerAuthInputPacket Time: 200000000 Count: 7800 Avg: 25641.02 Violations: 0 RecordId: 108 ParentRecordId: 106 TimerId: 797474 Ticks: 3100 Peak: 15000000
    Server Tick Update Cycle Time: 6300000000 Count: 3200 Avg: 1968750.0 Violations: 10 RecordId: 200 ParentRecordId: 100 TimerId: 15 Ticks: 3200 Peak: 440000000
        Scheduler Time: 300000000 Count: 3200 Avg: 93750.0 Violations: 1 RecordId: 201 ParentRecordId: 200 TimerId: 35 Ticks: 3200 Peak: 85000000
            Scheduler - Sync Tasks Time: 200000000 Count: 5000 Avg: 40000.0 Violations: 1 RecordId: 202 ParentRecordId: 201 TimerId: 50 Ticks: 3200 Peak: 82000000
        Worlds - World Tick Time: 5000000000 Count: 6400 Avg: 781250.0 Violations: 5 RecordId: 300 ParentRecordId: 200 TimerId: 85079 Ticks: 3200 Peak: 45000000
            world - World Tick Time: 3200000000 Count: 3200 Avg: 1000000.0 Violations: 3 RecordId: 301 ParentRecordId: 300 TimerId: 85080 Ticks: 3200 Peak: 45000000
                Worlds - Entity Tick Time: 1200000000 Count: 3200 Avg: 375000.0 Violations: 0 RecordId: 302 ParentRecordId: 301 TimerId: 85075 Ticks: 3200 Peak: 20000000
                    world - Entity Tick Time: 1200000000 Count: 3200 Avg: 375000.0 Violations: 0 RecordId: 303 ParentRecordId: 302 TimerId: 85076 Ticks: 3200 Peak: 20000000
                        Entity Tick - Player Time: 800000000 Count: 12000 Avg: 66666.66 Violations: 0 RecordId: 304 ParentRecordId: 303 TimerId: 804565 Ticks: 3200 Peak: 15000000
                        Entity Tick - ItemEntity Time: 150000000 Count: 25000 Avg: 6000.0 Violations: 0 RecordId: 305 ParentRecordId: 303 TimerId: 930115 Ticks: 3200 Peak: 3000000
                        Entity Tick - phpcube\\entity\\type\\TenguBoss Time: 250000000 Count: 4000 Avg: 62500.0 Violations: 0 RecordId: 306 ParentRecordId: 303 TimerId: 930315 Ticks: 2000 Peak: 8000000
                Worlds - Random Chunk Updates Time: 1400000000 Count: 3200 Avg: 437500.0 Violations: 0 RecordId: 307 ParentRecordId: 301 TimerId: 85069 Ticks: 3200 Peak: 35000000
                    world - Random Chunk Updates Time: 1400000000 Count: 3200 Avg: 437500.0 Violations: 0 RecordId: 308 ParentRecordId: 307 TimerId: 85070 Ticks: 3200 Peak: 35000000
                Worlds - Neighbour Block Updates Time: 300000000 Count: 3200 Avg: 93750.0 Violations: 0 RecordId: 309 ParentRecordId: 301 TimerId: 85067 Ticks: 3200 Peak: 8000000
                    world - Neighbour Block Updates Time: 300000000 Count: 3200 Avg: 93750.0 Violations: 0 RecordId: 310 ParentRecordId: 309 TimerId: 85068 Ticks: 3200 Peak: 8000000
            nether - World Tick Time: 80000000 Count: 3200 Avg: 25000.0 Violations: 0 RecordId: 311 ParentRecordId: 300 TimerId: 85169 Ticks: 3200 Peak: 2000000
            spawn - World Tick Time: 1600000000 Count: 3200 Avg: 500000.0 Violations: 2 RecordId: 312 ParentRecordId: 300 TimerId: 85293 Ticks: 3200 Peak: 20000000
                Worlds - Entity Tick Time: 1000000000 Count: 3200 Avg: 312500.0 Violations: 0 RecordId: 313 ParentRecordId: 312 TimerId: 85075 Ticks: 3200 Peak: 18000000
                    spawn - Entity Tick Time: 1000000000 Count: 3200 Avg: 312500.0 Violations: 0 RecordId: 314 ParentRecordId: 313 TimerId: 85295 Ticks: 3200 Peak: 18000000
                        Entity Tick - Human Time: 400000000 Count: 30000 Avg: 13333.33 Violations: 0 RecordId: 315 ParentRecordId: 314 TimerId: 490702 Ticks: 3200 Peak: 5000000
                        Entity Tick - Player Time: 500000000 Count: 8000 Avg: 62500.0 Violations: 0 RecordId: 316 ParentRecordId: 314 TimerId: 804565 Ticks: 3200 Peak: 12000000
                Worlds - Random Chunk Updates Time: 200000000 Count: 3200 Avg: 62500.0 Violations: 0 RecordId: 317 ParentRecordId: 312 TimerId: 85069 Ticks: 3200 Peak: 5000000
        Connection Handler Time: 600000000 Count: 3200 Avg: 187500.0 Violations: 0 RecordId: 400 ParentRecordId: 200 TimerId: 20 Ticks: 3200 Peak: 25000000
            Player Network Send Time: 550000000 Count: 15000 Avg: 36666.66 Violations: 0 RecordId: 401 ParentRecordId: 400 TimerId: 21 Ticks: 3200 Peak: 20000000
        Memory Manager Time: 400000000 Count: 3200 Avg: 125000.0 Violations: 4 RecordId: 500 ParentRecordId: 200 TimerId: 17 Ticks: 3200 Peak: 390000000
            Cyclic Garbage Collector Time: 380000000 Count: 2 Avg: 190000000.0 Violations: 4 RecordId: 501 ParentRecordId: 500 TimerId: 74 Ticks: 2 Peak: 380000000
Guardian v1.3.3
    veroxcode\\Guardian\\Listener\\EventListener-&gt;onPacketReceive(DataPacketReceiveEvent) Time: 400000000 Count: 8000 Avg: 50000.0 Violations: 0 RecordId: 600 ParentRecordId: 106 TimerId: 86781 Ticks: 3100 Peak: 5000000
    veroxcode\\Guardian\\Listener\\EventListener-&gt;onPlayerMove(PlayerMoveEvent) Time: 200000000 Count: 5000 Avg: 40000.0 Violations: 0 RecordId: 601 ParentRecordId: 304 TimerId: 86798 Ticks: 3000 Peak: 8000000
CubeTop v1.0.0
    Task: phpcube\\task\\CubeHologramTask(interval:20) Time: 50000000 Count: 160 Avg: 312500.0 Violations: 1 RecordId: 700 ParentRecordId: 202 TimerId: 203911 Ticks: 160 Peak: 82000000
NoviceQuests v1.0.0
    Task: closure@plugins/NoviceQuests/src/NoviceQuests/NoviceQuests#L200(interval:40) Time: 20000000 Count: 80 Avg: 250000.0 Violations: 0 RecordId: 800 ParentRecordId: 202 TimerId: 300100 Ticks: 80 Peak: 5000000
# Version v26.0
# Obsidian Engine 5.41.2+dev
Sample time 163000000000 (163.0s)`;

// ─── App Init ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const parser = new TimingsParser();
    const analyzer = new TimingsAnalyzer();
    const ui = new TimingsUI();

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });

    // File drop
    const dropZone = document.getElementById('file-drop');
    const fileInput = document.getElementById('timings-file');

    ['dragenter', 'dragover'].forEach(ev => {
        dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(ev => {
        dropZone.addEventListener(ev, () => { dropZone.classList.remove('dragover'); });
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) handleFile(fileInput.files[0]);
    });

    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = () => {
            document.getElementById('timings-text').value = reader.result;
            // Switch to paste tab to show content
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.querySelector('[data-tab="paste"]').classList.add('active');
            document.getElementById('tab-paste').classList.add('active');
            dropZone.querySelector('.file-drop__text').textContent = `Loaded: ${file.name}`;
        };
        reader.readAsText(file);
    }

    // Analyze button
    const btnAnalyze = document.getElementById('btn-analyze');
    btnAnalyze.addEventListener('click', async () => {
        btnAnalyze.classList.add('loading');
        btnAnalyze.disabled = true;
        clearError();

        try {
            let text = '';
            const activeTab = document.querySelector('.tab.active').dataset.tab;

            if (activeTab === 'paste') {
                text = document.getElementById('timings-text').value.trim();
            } else if (activeTab === 'url') {
                const url = document.getElementById('timings-url').value.trim();
                if (!url) throw new Error('Please enter a timings URL');
                text = await fetchTimings(url);
            } else if (activeTab === 'file') {
                text = document.getElementById('timings-text').value.trim();
            }

            if (!text) throw new Error('No timings data provided. Paste text, enter a URL, or upload a file.');
            if (!text.includes('Full Server Tick Time')) {
                throw new Error('Invalid timings format. Make sure you\'re using raw timings text (add &raw=1 to timings.pmmp.io URL).');
            }

            // Parse & analyze (defer to allow loading state to render)
            await new Promise(r => setTimeout(r, 50));
            const parsed = parser.parse(text);
            const analysis = analyzer.analyze(parsed);
            ui.render(parsed, analysis);

        } catch (err) {
            showError(err.message);
        } finally {
            btnAnalyze.classList.remove('loading');
            btnAnalyze.disabled = false;
        }
    });

    // Demo button
    document.getElementById('btn-demo').addEventListener('click', () => {
        document.getElementById('timings-text').value = DEMO_TIMINGS;
        // Switch to paste tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelector('[data-tab="paste"]').classList.add('active');
        document.getElementById('tab-paste').classList.add('active');
        btnAnalyze.click();
    });

    // New analysis button
    document.getElementById('btn-new').addEventListener('click', () => {
        document.getElementById('results').classList.add('hidden');
        document.getElementById('hero').style.minHeight = '50vh';
        document.getElementById('hero').style.paddingTop = '';
        document.getElementById('hero').style.paddingBottom = '';
        document.getElementById('timings-text').value = '';
        document.getElementById('timings-url').value = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Tree controls
    document.getElementById('btn-expand-all').addEventListener('click', () => {
        document.querySelectorAll('.tree-children').forEach(c => c.classList.add('open'));
        document.querySelectorAll('.tree-node__toggle:not(.leaf)').forEach(t => t.classList.add('expanded'));
    });
    document.getElementById('btn-collapse-all').addEventListener('click', () => {
        document.querySelectorAll('.tree-children').forEach(c => c.classList.remove('open'));
        document.querySelectorAll('.tree-node__toggle').forEach(t => t.classList.remove('expanded'));
    });

    // Tree search
    let searchTimeout;
    document.getElementById('tree-search').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = e.target.value.toLowerCase().trim();
            document.querySelectorAll('.tree-node').forEach(node => {
                const name = (node.dataset.name || '').toLowerCase();
                if (!query) {
                    node.classList.remove('filtered-out', 'highlight');
                } else if (name.includes(query)) {
                    node.classList.remove('filtered-out');
                    node.classList.add('highlight');
                    // Expand parents
                    let parent = node.parentElement;
                    while (parent) {
                        if (parent.classList.contains('tree-children')) {
                            parent.classList.add('open');
                            const prevToggle = parent.previousElementSibling?.querySelector('.tree-node__toggle');
                            if (prevToggle) prevToggle.classList.add('expanded');
                        }
                        parent = parent.parentElement;
                    }
                } else {
                    node.classList.add('filtered-out');
                    node.classList.remove('highlight');
                }
            });
        }, 200);
    });

    // URL fetch
    async function fetchTimings(url) {
        // Normalize URL to raw format
        let rawUrl = url;
        if (url.includes('timings.pmmp.io') && !url.includes('raw=1')) {
            rawUrl = url + (url.includes('?') ? '&' : '?') + 'raw=1';
        }

        try {
            const resp = await fetch(rawUrl);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
            return await resp.text();
        } catch (e) {
            if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError') || e.message.includes('CORS')) {
                throw new Error(
                    'Could not fetch timings (likely CORS restriction). ' +
                    'Open the URL with &raw=1 in your browser, copy all text, and paste it here.'
                );
            }
            throw e;
        }
    }

    function showError(msg) {
        clearError();
        const err = document.createElement('div');
        err.className = 'error-msg';
        err.textContent = msg;
        document.querySelector('.input-group').appendChild(err);
    }

    function clearError() {
        document.querySelectorAll('.error-msg').forEach(e => e.remove());
    }
});
