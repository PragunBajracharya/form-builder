document.addEventListener('DOMContentLoaded', async (event) => {
    const sidebar = document.getElementById('sidebar');
    const formArea = document.getElementById('form-area');
    const container = document.getElementById('container');
    const previewTab = document.getElementById('preview-tab');
    const htmlCode = document.getElementById('html-code');
    const jsonCode = document.getElementById('json-code');
    let columnCount = {};
    let rowCount = 0
    let formSkeletonJSON = [];
    let draggedItem = null;
    let draggedFrom = null;

    // Add drag start event to sidebar items
    sidebar.addEventListener('dragstart', async (e) => {
        draggedFrom = sidebar
        if (e.target.getAttribute('draggable')) {
            e.dataTransfer.setData('text/plain', e.target.getAttribute('data-type'));
        }
    });

    // Prevent default to allow drop
    container.addEventListener('dragover', async (e) => {
        e.preventDefault();
        if (draggedFrom === formArea) {
            const afterElement = await getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(draggedItem);
            } else {
                container.insertBefore(draggedItem, afterElement);
            }
        }
    });

    // Handle the drop
    container.addEventListener('drop', async (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text');
        if (draggedFrom === sidebar) {
            await processDrop(e, type);
        } else if (draggedFrom === formArea) {

        }
    });

    document.addEventListener('click', async (e) => {
        if (e.target.className === "delete") {
            await deleteElement(e);
        }
    })

    async function processDrop(e, type) {
        let formElementName = null;
        let parentDiv = null;
        let targetElement = await gotToParent(e.target);
        if (type === 'column') {
            const targetDiv = e.target.closest('.row');
            if (!targetDiv) {
                alert("Please add a row first.")
                return
            }
            if (targetDiv.querySelector('input, button, select, textarea')) {
                alert("Please add column in a row without any fields.");
                return
            }
            parentDiv = await createNewColumn(targetDiv);
        } else if (type === 'row') {
            const targetDiv = e.target.id === "container" ? e.target : null;
            parentDiv = await createNewRow(targetDiv);
        } else {
            const targetDiv = e.target.closest('.column') || e.target.closest('.row');
            if (!targetDiv) {
                alert("Please add a row first.")
                return
            }
            if (e.target.querySelector(".column")) {
                alert("Please remove the columns or drop inside column.")
                return
            }
            if (targetDiv.classList.contains('row')) {
                const columnDiv = targetDiv.querySelector(".column");
                if (columnDiv) {
                    alert("Please drop inside column or in a different row.");
                    return
                }
            }
            formElementName = randomNameGenerator(type)
            const newElement = createFormElement(type, formElementName);
            parentDiv = targetDiv.querySelector('div')
            parentDiv.appendChild(newElement);
        }
        await removePTag(parentDiv);
        await buildFormSkeletonJSON(targetElement, type, "insert", formElementName);
        await updateTabs();
    }

    async function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll(".row:not([style*='display: none'])")];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    async function deleteElement(e) {
        const parentElement = e.target.parentElement
        const parentParentElement = e.target.parentElement.parentElement
        await buildFormSkeletonJSON(parentElement, null, "remove", null);
        await updateTabs();
        if (parentElement.classList.contains('column')) {
            const closestRow = parentElement.closest('.row');
            const rowId = closestRow.getAttribute("data-row-id");
            parentElement.remove();
            if (rowId) {
                await updateColumnWidths(rowId);
            }
        } else {
            parentElement.remove();
        }
        if (!parentParentElement.innerHTML.trim()) {
            const pTag = document.createElement('p');
            pTag.className = "text-gray-500";
            pTag.innerText = "Drop elements here";
            parentParentElement.appendChild(pTag);
        }
    }

    // Function to create form elements
    function createFormElement(type, formElementName) {
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-4 w-full relative';
        let element;

        switch (type) {
            case 'text':
                wrapper.className += " block"
                element = `<label class="block mb-2">Text Input</label>
                                   <input type="text" class="w-full p-2 border rounded" name="${formElementName}">`;
                break;
            case 'number':
                wrapper.className += " block"
                element = `<label class="block mb-2">Number Input</label>
                                   <input type="number" class="w-full p-2 border rounded" name="${formElementName}">`;
                break;
            case 'checkbox':
                element = `<label class="inline-flex items-center">
                                   <input type="checkbox" class="form-checkbox" name="${formElementName}">
                                   <span class="ml-2">Checkbox</span>
                                   </label>`;
                break;
            case 'radio':
                element = `<label class="inline-flex items-center pr-2">
                                   <input type="radio" class="form-radio" name="radio-group" name="${formElementName}">
                                   <span class="ml-2">Radio Button</span>
                                   </label>`;
                break;
            case 'select':
                wrapper.className += " block"
                element = `<label class="block mb-2">Select Dropdown</label>
                                   <select class="w-full p-2 border rounded" name="${formElementName}">
                                   <option>Option 1</option>
                                   <option>Option 2</option>
                                   </select>`;
                break;
            case 'submit':
                wrapper.className += " block";
                element = `<button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full" name="${formElementName}">Submit</button>`;
                break;
            case 'textarea':
                wrapper.className += " block";
                element = `<label class="block mb-2">Your message</label>
                            <textarea rows="4" class="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 " placeholder="Write your text here..." name="${formElementName}"></textarea>`;
                break;
        }

        wrapper.innerHTML = element;
        wrapper.appendChild(deleteButton())
        return wrapper;
    }

    // Function to create a new column
    async function createNewColumn(targetRow) {
        let parentRowId = targetRow.closest(".row").getAttribute("data-row-id");
        if (columnCount[parentRowId]) {
            columnCount[parentRowId] += 1;
        } else {
            columnCount[parentRowId] = 1;
        }
        const newColumnHTML = document.createElement('div');
        newColumnHTML.className = 'column w-1/2 p-2 relative';
        newColumnHTML.setAttribute('data-column-id', columnCount[parentRowId]);
        newColumnHTML.innerHTML = `
                    <div class="border-2 border-dashed border-gray-300 p-4 rounded-lg min-h-[100px]">
                        <p class="text-gray-500">Drop elements here</p>
                    </div>
                `;
        newColumnHTML.appendChild(deleteButton());
        let parentDiv = targetRow.querySelector('div');
        parentDiv.appendChild(newColumnHTML);
        await updateColumnWidths(parentRowId);
        return parentDiv;
    }

    async function createNewRow(targetDiv) {
        rowCount++;
        const newRowHTML = document.createElement("div");
        let parentDiv = null;
        newRowHTML.className = "row w-full p-2 relative";
        newRowHTML.setAttribute("data-row-id", rowCount);
        newRowHTML.setAttribute("draggable", "true");
        newRowHTML.innerHTML = `
                    <div class="border-2 border-dashed border-gray-300 p-4 rounded-lg flex flex-wrap">
                        <p class="text-gray-500">Drop elements here</p>
                    </div>`;
        newRowHTML.appendChild(deleteButton());
        newRowHTML.appendChild(reorderButton())
        if (!targetDiv) {
            container.appendChild(newRowHTML);
        } else if (targetDiv.id === "container") {
            targetDiv.appendChild(newRowHTML);
        } else {
            let parentDiv = targetDiv.querySelector('div');
            parentDiv.appendChild(newRowHTML);
        }
        await addDragAndDropListeners(newRowHTML);
        return parentDiv;
    }

    async function addDragAndDropListeners(row) {
        row.addEventListener("dragstart", function () {
            draggedItem = this;
            draggedFrom = formArea
            setTimeout(() => this.style.display = "none", 0);
        });

        row.addEventListener("dragend", async function () {
            setTimeout(async () => {
                draggedItem.style.display = "block";
                draggedItem = null;
                await buildFormSkeletonJSON(row, null, "reorder", null);
                await updateTabs();
            }, 0);
        });
    }

    // Function to update column widths
    async function updateColumnWidths(parentRowId) {
        const row = container.querySelector(`.row[data-row-id="${parentRowId}"]`);
        const columns = row.querySelectorAll('.column');
        const columnCount = columns.length;
        let widthClass;

        switch (columnCount) {
            case 1:
                widthClass = 'w-full';
                break;
            case 2:
                widthClass = 'w-1/2';
                break;
            case 3:
                widthClass = 'w-1/3';
                break;
            default:
                widthClass = 'w-1/4';
        }

        columns.forEach(column => {
            column.className = `column ${widthClass} p-2`;
        });
    }

    async function removePTag(parentDiv) {
        if (parentDiv) {
            const children = Array.from(parentDiv.children);
            for (const child of children) {
                if (child.tagName === 'P' && child.textContent.trim() === "Drop elements here") {
                    child.remove();
                }
            }
        }
    }

    function deleteButton() {
        const deleteButton = document.createElement("div");
        deleteButton.className = "delete"
        deleteButton.innerText = "\u00D7";
        return deleteButton;
    }

    function reorderButton() {
        const reorderButton = document.createElement("div");
        reorderButton.className = "reorder"
        reorderButton.innerHTML = "&#x2725;";
        return reorderButton;
    }

    async function buildFormSkeletonJSON(targetElement, type, operation = "insert", formElementName = null) {
        let rowId = null, columnId = null, row = null, column = null;
        if (operation === "insert") {
            if (type === "row") {
                formSkeletonJSON.push({
                    "type": "row",
                    "id": rowCount,
                    "hasColumn": false,
                    "columns": [],
                    "fields": []
                })
            } else if (type === "column") {
                row = targetElement.closest(".row");
                rowId = row?.getAttribute("data-row-id");
                formSkeletonJSON.map((data) => {
                    if (data["type"] === "row" && data["id"] === parseInt(rowId)) {
                        if (!data["hasColumn"]) {
                            data["hasColumn"] = true
                        }
                        data["columns"].push({
                            "type": "column",
                            "id": columnCount[rowId],
                            "fields": []
                        })
                    }
                })
            } else {
                row = targetElement.closest(".row");
                column = targetElement.closest(".column");
                rowId = parseInt(row?.getAttribute("data-row-id"));
                columnId = parseInt(column?.getAttribute("data-column-id"));
                if (columnId) {
                    for (const data of formSkeletonJSON) {
                        if (data["type"] === "row") {
                            if (data["id"] === rowId) {
                                for (const col of data["columns"]) {
                                    if (col["id"] === columnId) {
                                        col["fields"].push({
                                            "type": type,
                                            "id": formElementName,
                                            "name": formElementName,
                                            "label": formElementName
                                        })
                                    }
                                }
                            }
                        }
                    }
                } else if (rowId) {
                    for (const data of formSkeletonJSON) {
                        if (data["type"] === "row") {
                            if (data["id"] === rowId) {
                                data["fields"].push({
                                    "type": type,
                                    "id": formElementName,
                                    "name": formElementName,
                                    "label": formElementName
                                })
                            }
                        }
                    }
                }
            }
        } else if (operation === "remove") {
            rowId = parseInt(targetElement?.getAttribute("data-row-id"));
            columnId = parseInt(targetElement?.getAttribute("data-column-id"));
            if (rowId) {
                formSkeletonJSON = formSkeletonJSON.filter((row) => {
                    return row["type"] === "row" && row["id"] !== rowId;
                })
            } else if (columnId) {
                rowId = parseInt(targetElement?.closest(".row").getAttribute("data-row-id"));
                formSkeletonJSON = formSkeletonJSON.map(row => {
                    if (row.hasColumn && Array.isArray(row.columns) && row.id === rowId) {
                        return {
                            ...row,
                            columns: row.columns.filter(column => column.type === "column" && column.id !== columnId)
                        };
                    }
                    return row;
                });
            } else {
                rowId = parseInt(targetElement?.closest(".row")?.getAttribute("data-row-id"));
                columnId = parseInt(targetElement?.closest(".column")?.getAttribute("data-column-id"));
                formElementName = getFormElementName(targetElement);
                if (columnId) {
                    formSkeletonJSON = formSkeletonJSON.map(row => {
                        if (row.id === rowId && row.hasColumn && Array.isArray(row.columns)) {
                            return {
                                ...row,
                                columns: row.columns.map(column => {
                                    if (column.id === columnId && Array.isArray(column.fields) && column.fields.length > 0) {
                                        return {
                                            ...column,
                                            fields: column.fields.filter(field => field.name !== formElementName)
                                        };
                                    }
                                    return column;
                                })
                            };
                        }
                        return row;
                    })
                } else {
                    formSkeletonJSON = formSkeletonJSON.map(row => {
                        if (row.fields.length > 0 && Array.isArray(row.fields) && row.id === rowId) {
                            return {
                                ...row,
                                fields: row.fields.filter(field => field.name !== formElementName)
                            };
                        }
                        return row;
                    });
                }
            }
        } else if (operation === "reorder") {
            let rowIds = [...container.querySelectorAll(".row")].map(row => (parseInt(row.getAttribute("data-row-id"))));
            formSkeletonJSON = formSkeletonJSON.sort((a, b) => rowIds.indexOf(a.id) - rowIds.indexOf(b.id))
        }
    }

    function randomNameGenerator(type) {
        return type + '-' + (Math.floor(Math.random(type.length) * 90000) + 10000);
    }

    async function gotToParent(eTarget) {
        if (eTarget.nodeName === 'P') {
            return eTarget.parentElement
        }
        return eTarget;
    }

    function getFormElementName(targetElement) {
        if (!targetElement) return null;

        const formElements = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'];
        if (formElements.includes(targetElement.tagName) && targetElement.name) {
            return targetElement.name;
        }

        const foundElement = targetElement.querySelector('input[name], button[name], select[name], textarea[name]');
        return foundElement ? foundElement.name : null;
    }

    // Function to update tabs
    async function updateTabs() {
        // Update Preview tab
        // previewTab.appendChild(createHtml(formSkeletonJSON));
        //
        // // Update HTML tab
        // htmlCode.textContent = createHtml(formSkeletonJSON);

        jsonCode.textContent = JSON.stringify(formSkeletonJSON, null, 2);
    }

    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.add('hidden'));
            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.remove('hidden');
        });
    });

    function createHtml(jsonData) {
        const container = document.createElement('div');

        jsonData.forEach((row) => {
            const rowElement = document.createElement('div');
            rowElement.className = 'row';

            if (row.hasColumn) {
                row.columns.forEach((column) => {
                    const columnElement = document.createElement('div');
                    columnElement.className = 'column';

                    column.fields.forEach((field) => {
                        const fieldElement = createFieldElement(field);
                        columnElement.appendChild(fieldElement);
                    });

                    rowElement.appendChild(columnElement);
                });
            } else {
                row.fields.forEach((field) => {
                    const fieldElement = createFieldElement(field);
                    rowElement.appendChild(fieldElement);
                });
            }

            container.appendChild(rowElement);
        });

        return container;
    }

    function createFieldElement(field) {
        let fieldElement;

        switch (field.type) {
            case 'text':
                fieldElement = document.createElement('input');
                fieldElement.type = 'text';
                fieldElement.id = field.id;
                fieldElement.name = field.name;
                fieldElement.placeholder = field.label;
                break;
            case 'checkbox':
                fieldElement = document.createElement('input');
                fieldElement.type = 'checkbox';
                fieldElement.id = field.id;
                fieldElement.name = field.name;
                const checkboxLabel = document.createElement('label');
                checkboxLabel.htmlFor = field.id;
                checkboxLabel.textContent = field.label;
                fieldElement = document.createElement('div');
                fieldElement.appendChild(checkboxLabel);
                fieldElement.appendChild(fieldElement);
                break;
            case 'submit':
                fieldElement = document.createElement('button');
                fieldElement.type = 'submit';
                fieldElement.id = field.id;
                fieldElement.name = field.name;
                fieldElement.textContent = field.label;
                break;
            default:
                fieldElement = document.createElement('p');
                fieldElement.textContent = `Unknown field type: ${field.type}`;
        }

        return fieldElement;
    }
});
