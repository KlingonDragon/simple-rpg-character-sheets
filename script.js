//fake jquery (shortened selector code) and other prototypes
window.$ = selector => document.querySelector(selector);
window.$$ = selector => document.querySelectorAll(selector);
HTMLElement.prototype.$ = function (selector) { return this.querySelector(selector); };
HTMLElement.prototype.$$ = function (selector) { return this.querySelectorAll(selector); };
window._ = element => document.createElement(element);
HTMLElement.prototype._ = function (...items) {
    items.forEach(item => {
        if (typeof item == 'string') {
            this.insertAdjacentHTML('beforeend', item);
        } else if (item !== undefined && item !== null) {
            this.append(item);
        }
    });
    return this;
};
NodeList.prototype.map = Array.from(this).map;
HTMLCollection.prototype.map = Array.from(this).map;
NodeList.prototype.reduce = Array.from(this).reduce;
HTMLCollection.prototype.reduce = Array.from(this).reduce;
String.prototype.in = function(test) {return test?.toLowerCase().indexOf(this?.toLowerCase()) != -1;}
String.prototype.contains = function (test) { return this?.toLowerCase().indexOf(test?.toLowerCase()) != -1; }
const DOMContentLoaded = new Promise((resolve, reject) => {
    window.addEventListener('DOMContentLoaded', resolve);
});
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register('./worker.js')
}
const localCharacterList = JSON.parse(localStorage.getItem('characterList')) ?? [];
const saveLocalCharacterList = () => localStorage.setItem('characterList', JSON.stringify(localCharacterList));
DOMContentLoaded.then(() => {
    console.log(localCharacterList);
    localCharacterList.forEach(localCharacter => {
        let butCharacter = _('button');
        butCharacter.textContent = localCharacter;
        $('nav')._(butCharacter);
        butCharacter.onclick = ()=>loadCharacter(butCharacter);
    });
    let butNewCharacter = $('button#newCharacter');
    butNewCharacter.onclick = () => {
        selectedTab(butNewCharacter);
        const main = $('main');
        main.innerHTML = '';
        fetch('./templates.json').then(response => response.json()).then(templates => {
            templates.forEach(template => {
                let container = _('div'), innerContainer = _('div'), button = _('button');
                container.classList.add('templateBox')
                innerContainer.classList.add('templateDesc')
                button.textContent = 'Use This Template';
                button.onclick = () => {
                    let butCharacter = _('button');
                    butCharacter.textContent = 'New Character';
                    localCharacterList.push('New Character')
                    $('nav')._(butCharacter);
                    butCharacter.onclick = () => { loadCharacter(butCharacter) };
                    fetch(template.path).then(response => response.json()).then(renderTemplate).then(()=>selectedTab(butCharacter)).then(saveLocalCharacterList);
                }
                container._(innerContainer._(`<strong>${template.name}<strong>`,`by ${template.author}`), button);
                main._(container);
            });
        })
    }
});
function selectedTab(tab) {
	$$('nav > .selected').forEach(highlightedTab => {
		highlightedTab.classList.remove('selected');
	});
	tab.classList.add('selected');
}
const findInput = (name) => $(`main input[name="${name}"]`);
function loadCharacter(button) {
    selectedTab(button);
    let savedCharacter = JSON.parse(localStorage.getItem(button.textContent));
    console.log(savedCharacter);
    fetch(savedCharacter.template_path).then(response => response.json()).then(
        template => renderTemplate(template, savedCharacter.name)
    ).then(
        () => savedCharacter.inputs.forEach(input => {
            if (!findInput(input.key)) {
                if (input.key.contains('table_')) {
                    $$('table').forEach(table => {
                        if (`table_${table.name}_`.in(input.key)) {
                            do {
                                table.newRow();
                            } while (!findInput(input.key));
                        }
                    });
                }
            }
            let theInput
            if (theInput = findInput(input.key)) {
                theInput.value = input.value;
            }
        })
    ).then(() => { if (savedCharacter.notes) { $('main textarea#notes').value = savedCharacter.notes; } });
}
function renderTemplate(template, name = 'New Character') {
    $('title').innerHTML = `RPG Sheets | ${template.name} by ${template.author}`;
    const main = $('main');
    main.innerHTML = '';
    main.dataset.templatePath= template.path;
    let h2 = _('h2');
    h2.id = 'character_name';
    h2.textContent = name;
    h2.prevValue = name;
    h2.contentEditable = true;
    h2.oninput = () => {
        let i = localCharacterList.indexOf(h2.prevValue);
        if (i !== -1) {
            localCharacterList[i] = h2.textContent;
        } else {
            localCharacterList.push(h2.textContent)
        }
        saveLocalCharacterList();
        $('nav > .selected').textContent = h2.textContent;
        localStorage.removeItem(h2.prevValue);
        saveSheet();
        h2.prevValue = h2.textContent;
    };
    main._(h2);
    main.__(template.items);
    let notes = _('textarea');
    notes.id = 'notes';
    notes.name = 'notes';
    main._(_('h3')._('Notes:'), notes);
    main._(`Template: ${template.name} by ${template.author}`)
    $$('main input, main textarea#notes').forEach(input => input.oninput = saveSheet);
    let butDelete = _('button');
    butDelete.id = 'deleteCharacter';
    butDelete.textContent = 'Delete This Character';
    butDelete.onclick = () => {
        if (confirm("Are you sure you want to delte this character?")) {
            localStorage.removeItem(h2.textContent);
            let i = localCharacterList.indexOf(h2.textContent);
            if (i !== -1) {
                localCharacterList.splice(i, 1);
            }
            saveLocalCharacterList();
            location.reload();
        }
    }
    main._(_('br'),butDelete);
}
const textNodeList = ["h3", "h4", "h5", "h6", "strong", "p", "span", "div"];
HTMLElement.prototype.__ = function (items) {
    this._(...items.map(createNode));
    return this;
};
function createNode(template) {
    let node;
    if (template.type == "row") {
        node = _('div');
        node.classList.add('row');
        node.__(template.items);
    }
    if (template.type == "column") {
        node = _('div');
        node.classList.add('col');
        node.__(template.items);
    }
    if (textNodeList.indexOf(template.type) != -1) {
        node = _(template.type);
        node.textContent = template.text;
    }
    if (template.type == "input") {
        node = _('label');
        node._(template.label);
        let input = _('input');
        input.name = template.name;
        input.type = template.input_type;
        node._(input);
        if (template.options) {
            let list = _('datalist')._(...template.options.map(option => {
                let optionNode = _('option');
                optionNode.value = option;
                return optionNode;
            }));
            list.id = `datalist_${input.name}`;
            node._(list);
            input.setAttribute('list', `datalist_${input.name}`);
        }
        if (template.suffix) {
            node._(`<small>${template.suffix}</small>`);
        }
    }
    if (template.type == "input_table") {
        node = _('table')
        node._(
            _('thead')._(...template.cols.map(col => _('th')._(col.label, col.options ? ((options) => {
                let list = _('datalist');
                list.id = `table_datalist_${col.name}`;
                list._(...options.map(option => { let optionNode = _('option'); optionNode.value = option; return optionNode; }));
                return list
            })(col.options):null))),
            _('tbody'),
            _('tfoot')._(_('tr')._(_('td')._(_('button')._('New Row'))))
        );
        node.name = template.name;
        node.template = template;
        node.input_rows = 0;
        node.newRow = () => {
            node.$('tbody').___(node);
            node.$$('input').forEach(input=>input.oninput = saveSheet);
        }
        node.$('tfoot td').colSpan = template.cols.length;
        node.$('tfoot button').onclick = node.newRow;
        node.newRow();
    }
    if (template.border) { node.classList.add('border'); }
    if (template.grow) { node.classList.add('grow'); }
    return node;
}
HTMLElement.prototype.___ = function (table) {
    this._(_('tr')._(...table.template.cols.map(createTableNode, table)));
    table.input_rows += 1;
    return this;
};
function createTableNode(template) {
    let node;
    if (textNodeList.indexOf(template.type) != -1) {
        node = _(template.type);
        node.textContent = template.text;
    }
    if (template.type == "input") {
        node = _('label');
        let input = _('input');
        input.name = `table_${this.name}_${template.name}_${this.input_rows}`;
        input.type = template.input_type;
        node._(input);
        if (template.options) {
            input.setAttribute('list', `table_datalist_${template.name}`);
        }
        if (template.suffix) {
            node._(`<small>${template.suffix}</small>`);
        }
    }
    return _('td')._(node);
}
createTableNode
function saveSheet() {
    const character_name = $('h2#character_name').textContent;
    console.log(character_name);
    localStorage.setItem(character_name, JSON.stringify({
        name: character_name,
        template_path: $('main').dataset.templatePath,
        inputs: $$('main input').map(input => (input.value ? { key: input.name, value: input.value } : { key: '', value: '' })),
        notes: $('main textarea#notes').value
    }));
}