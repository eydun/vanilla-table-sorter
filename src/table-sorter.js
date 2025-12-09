const STYLE_ID = 'vts-styles';

const CSS = `
th.sortable {
    cursor: pointer;
    user-select: none;
    position: relative;
    white-space: nowrap;
}

th.sortable:hover svg {
    opacity: 0.6;
}

th.sortable svg {
    width: 0.9em;
    height: 0.9em;
    display: inline-block;
    vertical-align: middle;
    margin-left: 0.4em;
    opacity: 0.35;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    filter: drop-shadow(0 0 1px rgba(0,0,0,0.1));
}

th.sortable.sort-active svg {
    opacity: 1;
}

th.sortable svg.desc {
    transform: rotate(180deg);
}
`;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
}

/**
 * Create a table sorter instance for the given table ID.
 * Usage:
 *   import { tableSorter } from '@eydun/vanilla-table-sorter';
 *   tableSorter('demoTable').init();
 *
 * Add data-sort attribute to <th> elements to make them sortable:
 *   <th data-sort>Name</th>           - Auto-detect column index
 *   <th data-sort="0">Name</th>       - Explicit column index
 */
export function tableSorter(tableId) {
    const STORAGE_KEY = `vts-sortOrders-${tableId}`;

    return {
        sortOrders: [],

        init() {
            ensureStyles();

            const table = document.getElementById(tableId);
            if (!table) {
                console.warn(`[vanilla-table-sorter] Table with id="${tableId}" not found.`);
                return;
            }

            // Setup sortable headers
            const headers = table.querySelectorAll('th[data-sort]');
            headers.forEach((th, autoIndex) => {
                // Determine column index
                const explicitIndex = th.dataset.sort;
                const index = explicitIndex !== '' ? parseInt(explicitIndex, 10) : autoIndex;

                if (Number.isNaN(index)) {
                    console.warn(`[vanilla-table-sorter] Invalid data-sort value:`, th);
                    return;
                }

                // Store normalized index
                th.dataset.sort = index;

                // Add sortable class for styling
                th.classList.add('sortable');

                // Auto-insert sort icon if not present
                if (!th.querySelector('svg')) {
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('viewBox', '0 0 16 16');
                    svg.setAttribute('fill', 'currentColor');
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', 'M8 3.5 L12.5 9.5 L11.2 9.5 L8 5.5 L4.8 9.5 L3.5 9.5 Z');
                    svg.appendChild(path);
                    th.appendChild(svg);
                }

                // Attach click handler
                th.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.sort(index, e);
                });
            });

            // Load saved sort state
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    this.sortOrders = JSON.parse(saved);
                    this.applySort();
                    this.updateHeaderClasses();
                }
            } catch (e) {
                console.warn('[vanilla-table-sorter] Failed to read sort state from localStorage:', e);
            }
        },

        sort(colIndex, event) {
            const existingIndex = this.sortOrders.findIndex(o => o.index === colIndex);

            if (event.shiftKey) {
                // Multi-column sort (add or toggle column)
                if (existingIndex === -1) {
                    this.sortOrders.push({ index: colIndex, asc: true });
                } else {
                    this.sortOrders[existingIndex].asc = !this.sortOrders[existingIndex].asc;
                }
            } else {
                // Single-column sort (reset others)
                if (
                    existingIndex !== -1 &&
                    this.sortOrders.length === 1 &&
                    this.sortOrders[0].index === colIndex
                ) {
                    // Toggle same column
                    this.sortOrders[0].asc = !this.sortOrders[0].asc;
                } else {
                    // New primary column
                    this.sortOrders = [{ index: colIndex, asc: true }];
                }
            }

            this.applySort();
            this.updateHeaderClasses();

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sortOrders));
            } catch (e) {
                console.warn('[vanilla-table-sorter] Failed to save sort state to localStorage:', e);
            }
        },

        applySort() {
            const table = document.getElementById(tableId);
            if (!table || !table.tBodies[0]) return;

            const rows = Array.from(table.tBodies[0].rows);

            rows.sort((a, b) => {
                for (const { index, asc } of this.sortOrders) {
                    const valA = a.cells[index]?.textContent.trim() ?? '';
                    const valB = b.cells[index]?.textContent.trim() ?? '';

                    const numA = parseFloat(valA);
                    const numB = parseFloat(valB);
                    const isNumeric = !Number.isNaN(numA) && !Number.isNaN(numB);

                    let cmp = isNumeric ? (numA - numB) : valA.localeCompare(valB);

                    if (cmp !== 0) return asc ? cmp : -cmp;
                }
                return 0;
            });

            rows.forEach(row => table.tBodies[0].appendChild(row));
        },

        updateHeaderClasses() {
            const table = document.getElementById(tableId);
            if (!table) return;

            table.querySelectorAll('th[data-sort]').forEach(th => {
                const index = parseInt(th.dataset.sort, 10);
                const svg = th.querySelector('svg');

                th.classList.remove('sort-active');
                svg?.classList.remove('desc');

                const sort = this.sortOrders.find(s => s.index === index);
                if (sort) {
                    th.classList.add('sort-active');
                    if (!sort.asc) svg?.classList.add('desc');
                }
            });
        }
    };
}

export default tableSorter;
