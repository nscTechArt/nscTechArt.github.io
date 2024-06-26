/**
 * Hightlight specifiled lines
 */

function removeLinesInner(codeBlock, removed_lines) {
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
          if (removed_lines.includes(current_lineno)) {
            let removed_node = document.createElement('span');
            removed_node.setAttribute('class', 'remove');
            codeBlock.insertBefore(removed_node, current_line);
            for (let next = removed_node.nextSibling; next != subNodes[i]; next = removed_node.nextSibling)
              removed_node.appendChild(next);
            removed_node.appendChild(subNodes[i]);
          }
          current_line = subNodes[i + 1];
          current_lineno++;
        }
      }
    }
  };

  export function removeLines() {
    let blocks = document.getElementsByClassName('highlighter-rouge');
    [...blocks].forEach((elem) => {
      const attr_removed_lines = elem.getAttribute('remove-lines');
      if (attr_removed_lines && attr_removed_lines.length > 0) {
        let lines = [];
        let scopes = (',' + attr_removed_lines).match(/(?<=\s|,)\d+(-\d+)?/g)
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
        removeLinesInner(pre, lines);
        elem.removeAttribute('remove-lines');
      }
    })
  }
