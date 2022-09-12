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
const localCharacterList = (JSON.parse(localStorage.getItem('characterList')) ?? []).filter((item, index, arr) => arr.indexOf(item) === index);
const saveLocalCharacterList = () => localStorage.setItem('characterList', JSON.stringify(localCharacterList));
DOMContentLoaded.then(() => {
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
        delete main.dataset.templatePath;
        let container = _('div'), innerContainer = _('div'), button = _('button'), fileInput = _('input');
        container.classList.add('templateBox')
        innerContainer.classList.add('templateDesc')
        fileInput.id = 'importFile';
        fileInput.name = 'importFile';
        fileInput.type = 'file';
        fileInput.accept = '.json';
        button.textContent = 'Import from File';
        button.onclick = () => {
            new Response(fileInput.files[0]).json().then(json => {
                localStorage.setItem(json.name, JSON.stringify(json));
                let butCharacter = _('button');
                butCharacter.textContent = json.name;
                localCharacterList.push(json.name)
                saveLocalCharacterList();
                $('nav')._(butCharacter);
                butCharacter.onclick = () => { loadCharacter(butCharacter) };
                loadCharacter(butCharacter);
            })
        };
        main._(container._(innerContainer._(fileInput) ,button));
        fetch('./templates.json').then(response => response.json()).then(templates => {
            templates.forEach(template => {
                let container = _('div'), titleContainer = _('div'), button = _('button');
                container.classList.add('templateBox')
                titleContainer.classList.add('templateTitle')
                button.textContent = 'Use This Template';
                button.onclick = () => {
                    let butCharacter = _('button');
                    butCharacter.textContent = 'New Character';
                    localCharacterList.push('New Character');
                    saveLocalCharacterList();
                    $('nav')._(butCharacter);
                    butCharacter.onclick = () => { loadCharacter(butCharacter) };
                    fetch(template.path).then(response => response.json()).then(renderTemplate).then(() => selectedTab(butCharacter)).then(saveSheet);
                };
                main._(container._(_('div')._(titleContainer._(_('strong')._(template.name),_('span')._('by ', _('u')._(template.author))), button), _(template.desc ? 'div':null)._(template.desc)));
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
                if (theInput.type == 'checkbox') {
                    theInput.checked = input.value;
                } else {
                    theInput.value = input.value;
                }
            }
        })
    ).then(() => { if (savedCharacter.notes) { $('main textarea#notes').value = savedCharacter.notes; } });
}
function renderTemplate(template, name = 'New Character') {
    $('title').innerHTML = `RPG Sheets | ${template.name} by ${template.author}`;
    const main = $('main');
    main.innerHTML = '';
    main.dataset.templatePath = template.path;
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
    $$('main input, main textarea, main select').forEach(input => input.addEventListener('input',saveSheet));
    let butExport = _('button');
    butExport.id = 'exportCharacter';
    butExport.textContent = 'Export This Character';
    butExport.onclick = () => {
        let download = _('a');
        download.href = `data:text/json;charset=utf-8,${encodeURIComponent(localStorage.getItem(h2.textContent))}`;
        download.download = `${h2.textContent}.json`;
        download.click();
        download.remove();
    }
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
    main._(_('br'),butExport,butDelete);
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
    if (template.type == "input" || template.type == "textarea") {
        node = _('label');
        if (template.label) {
            node._(_('span')._(template.label));
        }
        let input = _(template.type);
        input.name = template.name;
        if (template.input_type == 'plus_minus') {
            input.classList.add('plus_minus');
            input.type = 'text';
            input.inputmode = 'numeric';
            input.pattern = '[\\+\\-]\\d+'
        } else {
            input.type = template.input_type;
        }
        if (template.placeholder) {
            input.placeholder = template.placeholder;
        }
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
            node._(_('small')._(template.suffix));
        }
    }
    if (template.type == "select") {
        node = _('label');
        if (template.label) {
            node._(_('span')._(template.label));
        }
        let input = _('select');
        input.name = template.name;
        node._(input);
        input._(_('option'), ...template.options.map(option => {
            let optionNode = _('option')._(option);
            optionNode.value = option;
            return optionNode;
        }));
        if (template.suffix) {
            node._(_('small')._(template.suffix));
        }
    }
    if (template.type == "input_table") {
        node = _('table')._(
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
    if (template.centre) { node.classList.add('centre'); }
    if (template.border) { node.classList.add('border'); }
    if (template.corners === false) {node.classList.add('round_corners');}
    if (template.grow) { node.classList.add('grow'); }
    if (template.wrap === false) {node.classList.add('no_wrap');}
    if (template.bg) {
        node.classList.add('bg');
        if (CSS.supports('background-color', 'attr(data-bg-colour color)')) {
            node.dataset.bgColour = template.bg === true ? 'grey':template.bg;
        } else {
            node.style = `--bg-colour: ${template.bg === true ? 'grey' : template.bg}`;
        }
    }
    if (template.big) {
        if (template.big === true) {
            node.classList.add('big');
        } else if (Number(template.big) === template.big) {
            node.classList.add(`size_${template.big}`);
        }
    }
    if (template.short) { node.classList.add('short'); }
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
    if (template.type == "input" || template.type == "textarea") {
        node = _('label');
        let input = _(template.type);
        input.name = `table_${this.name}_${template.name}_${this.input_rows}`;
        if (template.input_type == 'plus_minus') {
            input.classList.add('plus_minus');
            input.type = 'text';
            input.inputmode = 'numeric';
            input.pattern = '[\\+\\-]\\d+'
        } else {
            input.type = template.input_type;
        }
        node._(input);
        if (template.options) {
            input.setAttribute('list', `table_datalist_${template.name}`);
        }
        if (template.placeholder) {
            input.placeholder = template.placeholder;
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
    localStorage.setItem(character_name, JSON.stringify({
        name: character_name,
        template_path: $('main').dataset.templatePath,
        inputs: $$('main input').map(input => ((input.type != 'checkbox' && input.value) || (input.type == 'checkbox' && input.checked) ? { key: input.name, value: (input.type == 'checkbox' ? input.checked : input.value) } : { key: '', value: '' })),
        notes: $('main textarea#notes').value
    }));
}