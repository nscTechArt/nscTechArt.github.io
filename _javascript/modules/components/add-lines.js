/**
 * Hightlight specifiled lines
 */

function addLinesInner(codeBlock, added_lines) {
  let current_line = null;
  let current_lineno = 1;
  for (let cur = codeBlock.firstChild; cur != null; cur = cur.nextSibling) {
    if (current_line == null)
      current_line = cur;
    let contents = cur.textContent.split(/\n/g);
    if ((contents || []).length > 1) {
      let newline_count = contents.length - 1;
      let subNodes = [];
      for (let i = 0; i < newline_count + 1; i++) {
        let subNode = cur.cloneNode(false);
        subNode.textContent = contents[i];
        if (i != newline_count)
          subNode.textContent += '\n';
        codeBlock.insertBefore(subNode, cur);
        subNodes.push(subNode);
      }
      codeBlock.removeChild(cur);
      cur = subNodes[newline_count];
      for (let i = 0; i < newline_count; i++) {
        if (added_lines.includes(current_lineno)) {
          let added_node = document.createElement('span');
          added_node.setAttribute('class', 'add');
          codeBlock.insertBefore(added_node, current_line);
          for (let next = added_node.nextSibling; next != subNodes[i]; next = added_node.nextSibling)
            added_node.appendChild(next);
          added_node.appendChild(subNodes[i]);
        }
        current_line = subNodes[i + 1];
        current_lineno++;
      }
    }
  }
};

export function addLines() {
  let blocks = document.getElementsByClassName('highlighter-rouge');
  [...blocks].forEach((elem) => {
    const attr_added_lines = elem.getAttribute('add-lines');
    if (attr_added_lines && attr_added_lines.length > 0) {
      let lines = [];
      let scopes = (',' + attr_added_lines).match(/(?<=\s|,)\d+(-\d+)?/g)
      scopes.forEach(function (val) {
        let pos = val.split('-');
        let start = parseInt(pos[0]);
        if (pos.length > 1) {
          let end = parseInt(pos[1]);
          if (end >= start) {
            for (let i = start; i <= end; i++) {
              lines.push(i);
            }
          }
        } else if (pos.length == 1) {
          lines.push(start);
        }
      })
      let pres = elem.getElementsByTagName('pre');
      let pre = pres[pres.length - 1];
      addLinesInner(pre, lines);
      elem.removeAttribute('add-lines');
    }
  })
}
