console.log("Initializing sfn-preview...");

(() => {

  const content = document.getElementById('content');
  
  const zoom = (value) => {
    const style = content.style;
    style.transform = `scale(${value})`;
    style.transformOrigin = `left top`;
  };

  const toggleRaw = () => {
    const rawDiv = document.getElementById('raw');
    if (rawDiv.style.display === 'none') {
      rawDiv.style.display = 'block';
    } else {
      rawDiv.style.display = 'none';
    }
  };

  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
      case 'zoom': {
        zoom(message.value);
        break;
      }
      case 'toggleRaw': {
        toggleRaw();
        break;
      }
    }
  });

  const dragElement = (ele) => {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    const dragMouseDown = (e) => {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    };

    const elementDrag = (e) => {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      ele.style.top = (ele.offsetTop - pos2) + 'px';
      ele.style.left = (ele.offsetLeft - pos1) + 'px';

      console.log('x, y: ' + ele.style.top + ', ' + ele.style.left);
    };

    const closeDragElement = (e) => {
      document.onmouseup = null;
      document.onmousemove = null;
    };

    if (document.getElementById(ele.id + "-header")) {
      document.getElementById(ele.id + "-header").onmousedown = dragMouseDown;
    } else {
      ele.onmousedown = dragMouseDown;
    }
  };

  dragElement(document.getElementById('content'));

})();
