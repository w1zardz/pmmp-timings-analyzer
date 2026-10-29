const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const helper = source.slice(source.indexOf('function createTreeFilter('), source.indexOf('async function fetchTimings('));
const createTreeFilter = vm.runInNewContext(helper + '\ncreateTreeFilter');

function fixture(size = 20) {
    let queries = 0, writes = 0;
    const elements = [];
    function element(classes = []) {
        const values = new Set(classes);
        const el = { classList: {
            add(...names) { writes++; names.forEach(n => values.add(n)); },
            remove(...names) { writes++; names.forEach(n => values.delete(n)); },
            contains(name) { return values.has(name); }
        }, values, dataset: {} };
        elements.push(el);
        return el;
    }
    const tv = element(), nodes = [];
    const branch = element(['tree-children']); branch.parentElement = tv;
    const toggle = element(); branch.previousElementSibling = { querySelector() { queries++; return toggle; } };
    const inner = element(['tree-children']); inner.parentElement = branch;
    const innerToggle = element(); inner.previousElementSibling = { querySelector() { queries++; return innerToggle; } };
    for (let i = 0; i < size; i++) {
        const node = element(); node.dataset.name = i % 2 ? 'Plugin: МИР & Event' : 'World tick';
        node.parentElement = i % 3 ? inner : branch; nodes.push(node);
    }
    tv.querySelectorAll = () => { queries++; return nodes; };
    return { tv, snapshot: () => elements.map(e => [...e.values].sort()), counts: () => ({ queries, writes }) };
}
function legacy(tv, q) {
    tv.querySelectorAll('.tree-node').forEach(nd => {
        const nm = (nd.dataset.name || '').toLowerCase();
        if (!q) nd.classList.remove('filtered-out', 'highlight');
        else if (nm.includes(q)) {
            nd.classList.remove('filtered-out'); nd.classList.add('highlight');
            let p = nd.parentElement;
            while (p && p !== tv) {
                if (p.classList.contains('tree-children')) {
                    p.classList.add('open'); p.previousElementSibling?.querySelector('.tree-node__toggle')?.classList.add('expanded');
                }
                p = p.parentElement;
            }
        } else { nd.classList.add('filtered-out'); nd.classList.remove('highlight'); }
    });
}
test('matches previous search state for repeated, cleared, Unicode and missing searches', () => {
    const old = fixture(), current = fixture();
    const filter = createTreeFilter(current.tv);
    for (const query of ['world', 'мир', 'event', 'missing', '', 'world', 'world', '']) {
        legacy(old.tv, query); filter(query);
        assert.deepEqual(current.snapshot(), old.snapshot(), query);
    }
});
test('shared ancestor work is bounded, not repeated per matching node', () => {
    const old = fixture(10000), current = fixture(10000);
    const filter = createTreeFilter(current.tv);
    legacy(old.tv, ''); filter('');
    legacy(old.tv, 'world'); filter('world');
    assert.deepEqual(current.snapshot(), old.snapshot());
    assert.equal(current.counts().queries, 3); // one node selection, two ancestor toggles
    assert.ok(old.counts().queries > 8000);
    console.log({ baseline: old.counts(), optimized: current.counts() });
});
test('empty tree and independent report caches', () => {
    const empty = fixture(0); createTreeFilter(empty.tv)('x');
    const a = fixture(), b = fixture();
    const before = b.snapshot(); createTreeFilter(a.tv)('world');
    assert.deepEqual(b.snapshot(), before);
});
