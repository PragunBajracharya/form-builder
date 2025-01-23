document.addEventListener('DOMContentLoaded', (event) => {
    const sidebar = document.getElementById('sidebar');
    const formArea = document.getElementById('form-area');
    const container = document.getElementById('container');
    let columnCount = {};
    let rowCount = 0

    // Add drag start event to sidebar items
    sidebar.addEventListener('dragstart', (e) => {
        if (e.target.getAttribute('draggable')) {
            e.dataTransfer.setData('text/plain', e.target.getAttribute('data-type'));
        }
    });

    // Prevent default to allow drop
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    // Handle the drop

    container.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text');

        if (type === 'column') {
            const targetDiv = e.target.closest('.row') || container.querySelector('.row');
            createNewColumn(targetDiv);
        } else if (type === 'row') {
            const targetDiv = e.target.id === "container" ? e.target : e.target.closest('.row') || container.querySelector('.row');
            createNewRow(targetDiv);
        } else {
            const targetDiv = e.target.closest('.column') || e.target.closest('.row') || container.querySelector('.column') || container.querySelector('.row');
            if (!targetDiv) {
                alert("Please add a row first.")
                return
            }
            const newElement = createFormElement(type);
            let parentDiv = targetDiv.querySelector('div')
            parentDiv.appendChild(newElement);
            removePTag(parentDiv);
        }
    });

    document.addEventListener('click', (e) => {
        if(e.target.className === "delete"){
            const parentElement = e.target.parentElement
            const parentParentElement = e.target.parentElement.parentElement
            if (parentElement.classList.contains('column')){
                const closestRow = parentElement.closest('.row');
                const rowId = closestRow.getAttribute("data-row-id");
                parentElement.remove();
                if (rowId) {
                    updateColumnWidths(rowId);
                }
            } else {
                parentElement.remove();
            }
            if (!parentParentElement.innerHTML.trim()){
                const pTag = document.createElement('p');
                pTag.className = "text-gray-500";
                pTag.innerText = "Drop elements here";
                parentParentElement.appendChild(pTag);
            }
        }
    })

    // Function to create form elements
    function createFormElement(type) {
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-4 w-full relative';
        let element;

        switch (type) {
            case 'text':
                wrapper.className += " block"
                element = `<label class="block mb-2">Text Input</label>
                                   <input type="text" class="w-full p-2 border rounded">`;
                break;
            case 'number':
                wrapper.className += " block"
                element = `<label class="block mb-2">Number Input</label>
                                   <input type="number" class="w-full p-2 border rounded">`;
                break;
            case 'checkbox':
                element = `<label class="inline-flex items-center">
                                   <input type="checkbox" class="form-checkbox">
                                   <span class="ml-2">Checkbox</span>
                                   </label>`;
                break;
            case 'radio':
                element = `<label class="inline-flex items-center pr-2">
                                   <input type="radio" class="form-radio" name="radio-group">
                                   <span class="ml-2">Radio Button</span>
                                   </label>`;
                break;
            case 'select':
                wrapper.className += " block"
                element = `<label class="block mb-2">Select Dropdown</label>
                                   <select class="w-full p-2 border rounded">
                                   <option>Option 1</option>
                                   <option>Option 2</option>
                                   </select>`;
                break;
            case 'submit':
                wrapper.className += " block";
                element = `<button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">Submit</button>`;
                break;
        }

        wrapper.innerHTML = element;
        wrapper.appendChild(deleteButton())
        return wrapper;
    }

    // Function to create a new column
    function createNewColumn(targetRow) {
        let parentRowId = targetRow.closest(".row").getAttribute("data-row-id");
        if(columnCount[parentRowId]){
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
        removePTag(parentDiv);
        updateColumnWidths(parentRowId);
    }

    function createNewRow(targetDiv) {
        rowCount++;
        const newRowHTML = document.createElement("div");
        newRowHTML.className = "row w-full p-2 relative";
        newRowHTML.setAttribute("data-row-id", rowCount);
        newRowHTML.innerHTML = `
                    <div class="border-2 border-dashed border-gray-300 p-4 rounded-lg flex flex-wrap">
                        <p class="text-gray-500">Drop elements here</p>
                    </div>`;
        newRowHTML.appendChild(deleteButton());
        if (!targetDiv) {
            container.appendChild(newRowHTML);
        } else if (targetDiv.id === "container") {
            targetDiv.appendChild(newRowHTML);
        }else {
            let parentDiv = targetDiv.querySelector('div');
            parentDiv.appendChild(newRowHTML);
            removePTag(parentDiv);
        }
    }

    // Function to update column widths
    function updateColumnWidths(parentRowId) {
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

    function removePTag(parentDiv) {
        const children = Array.from(parentDiv.children);
        children.forEach(child => {
            if(child.tagName === 'P' && child.textContent.trim() === "Drop elements here"){
                child.remove();
            }
        })
    }

    function deleteButton() {
        const deleteButton = document.createElement("div");
        deleteButton.className = "delete"
        deleteButton.innerText = "\u00D7";
        return deleteButton;
    }
});