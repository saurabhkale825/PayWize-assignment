import React, { useRef, useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:5000'); // Connect to the backend server

function App() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lineWidth, setLineWidth] = useState(5);
  const [strokeStyle, setStrokeStyle] = useState('black');
  const [tool, setTool] = useState('brush');
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(20);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
  }, [lineWidth, strokeStyle]);

  useEffect(() => {
    const savedCanvas = localStorage.getItem('canvasState');
    if (savedCanvas) {
      const img = new Image();
      img.src = savedCanvas;
      img.onload = () => {
        const context = canvasRef.current.getContext('2d');
        context.drawImage(img, 0, 0);
      };
    }
  }, []);

  useEffect(() => {
    socket.on('draw', (data) => {
      const context = canvasRef.current.getContext('2d');
      const { tool, strokeStyle, lineWidth, startPoint, endPoint, text } = data;
      context.strokeStyle = strokeStyle;
      context.lineWidth = lineWidth;
      context.beginPath();

      if (tool === 'brush') {
        context.lineCap = 'round';
        context.moveTo(startPoint.x, startPoint.y);
        context.lineTo(endPoint.x, endPoint.y);
        context.stroke();
      } else if (tool === 'eraser') {
        context.clearRect(endPoint.x - lineWidth / 2, endPoint.y - lineWidth / 2, lineWidth, lineWidth);
      } else if (tool === 'line') {
        context.moveTo(startPoint.x, startPoint.y);
        context.lineTo(endPoint.x, endPoint.y);
        context.stroke();
      } else if (tool === 'rectangle') {
        context.strokeRect(
          startPoint.x,
          startPoint.y,
          endPoint.x - startPoint.x,
          endPoint.y - startPoint.y
        );
      } else if (tool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(endPoint.x - startPoint.x, 2) +
          Math.pow(endPoint.y - startPoint.y, 2)
        );
        context.beginPath();
        context.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        context.stroke();
      } else if (tool === 'polygon') {
        drawPolygon(context, startPoint.x, startPoint.y, endPoint.x, endPoint.y, 5);
      } else if (tool === 'text') {
        context.font = `${fontSize}px Arial`;
        context.fillStyle = strokeStyle;
        context.fillText(text, startPoint.x, startPoint.y);
      }

      context.closePath();
    });

    return () => {
      socket.off('draw');
    };
  }, []);

  const saveState = () => {
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL();
    setUndoStack([...undoStack, dataURL]);
    setRedoStack([]);
    localStorage.setItem('canvasState', dataURL);
  };

  const startDrawing = (e) => {
    if (tool !== 'text') {
      saveState();
    }

    if (tool === 'text') {
      const context = canvasRef.current.getContext('2d');
      const { offsetX, offsetY } = e.nativeEvent;
      context.font = `${fontSize}px Arial`;
      context.fillStyle = strokeStyle;
      context.fillText(text, offsetX, offsetY);
      setText('');
      saveState();
    } else {
      setIsDrawing(true);
      const { offsetX, offsetY } = e.nativeEvent;
      setStartPoint({ x: offsetX, y: offsetY });
    }
  };

  const endDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const context = canvasRef.current.getContext('2d');
    const { offsetX, offsetY } = e.nativeEvent;
    const data = {
      tool,
      strokeStyle,
      lineWidth,
      startPoint,
      endPoint: { x: offsetX, y: offsetY },
      text,
    };

    socket.emit('draw', data); // Send drawing data to the server

    context.beginPath();

    if (tool === 'line') {
      context.moveTo(startPoint.x, startPoint.y);
      context.lineTo(offsetX, offsetY);
      context.stroke();
    } else if (tool === 'rectangle') {
      context.strokeRect(
        startPoint.x,
        startPoint.y,
        offsetX - startPoint.x,
        offsetY - startPoint.y
      );
    } else if (tool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(offsetX - startPoint.x, 2) +
        Math.pow(offsetY - startPoint.y, 2)
      );
      context.beginPath();
      context.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
      context.stroke();
    } else if (tool === 'polygon') {
      drawPolygon(context, startPoint.x, startPoint.y, offsetX, offsetY, 5);
    }

    context.closePath();
    saveState(); // Save state after drawing
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const context = canvasRef.current.getContext('2d');
    const { offsetX, offsetY } = e.nativeEvent;

    if (tool === 'brush') {
      context.strokeStyle = strokeStyle;
      context.lineTo(offsetX, offsetY);
      context.stroke();
      context.beginPath();
      context.moveTo(offsetX, offsetY);
    } else if (tool === 'eraser') {
      context.clearRect(offsetX - lineWidth / 2, offsetY - lineWidth / 2, lineWidth, lineWidth);
    }
  };

  const drawPolygon = (context, x1, y1, x2, y2, sides) => {
    const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const angle = (2 * Math.PI) / sides;
    context.beginPath();
    for (let i = 0; i < sides; i++) {
      const x = x1 + radius * Math.cos(i * angle);
      const y = y1 + radius * Math.sin(i * angle);
      context.lineTo(x, y);
    }
    context.closePath();
    context.stroke();
  };

  const undo = () => {
    if (undoStack.length === 0) return;

    const lastState = undoStack.pop();
    setRedoStack([...redoStack, canvasRef.current.toDataURL()]);

    const img = new Image();
    img.src = lastState;
    img.onload = () => {
      const context = canvasRef.current.getContext('2d');
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      context.drawImage(img, 0, 0);
    };
    localStorage.setItem('canvasState', undoStack[undoStack.length - 1] || '');
  };

  const redo = () => {
    if (redoStack.length === 0) return;

    const nextState = redoStack.pop();
    setUndoStack([...undoStack, canvasRef.current.toDataURL()]);

    const img = new Image();
    img.src = nextState;
    img.onload = () => {
      const context = canvasRef.current.getContext('2d');
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      context.drawImage(img, 0, 0);
    };
    localStorage.setItem('canvasState', nextState);
  };

  return (
    <div className='App'>
      <div className='heading'>Drawing Application</div>
      <div className="drawing-application">
        <div className="toolbar">
          <button onClick={() => setTool('brush')}>Brush</button>
          <button onClick={() => setTool('eraser')}>Eraser</button>
          <button onClick={() => setTool('line')}>Line</button>
          <button onClick={() => setTool('rectangle')}>Rectangle</button>
          <button onClick={() => setTool('circle')}>Circle</button>
          <button onClick={() => setTool('polygon')}>Polygon</button>
          <button onClick={() => setTool('text')}>Text</button>
          <input
            type="text"
            placeholder="Enter text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={tool !== 'text'}
            className='toolbar-option'
          />
          <input
            type="number"
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            disabled={tool !== 'text'}
            className='toolbar-option'
          />
          <input
            type="color"
            onChange={(e) => setStrokeStyle(e.target.value)}
            value={strokeStyle}
            className='toolbar-color'
          />
          <button onClick={() => setLineWidth(5)}>Small Brush</button>
          <button onClick={() => setLineWidth(10)}>Medium Brush</button>
          <button onClick={() => setLineWidth(15)}>Large Brush</button>
          <button onClick={undo}>Undo</button>
          <button onClick={redo}>Redo</button>
        </div>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={endDrawing}
          onMouseMove={draw}
          width={screenWidth * 0.8}
          height={screenHeight * 0.8}
          className='canvas'
        />
      </div>
    </div>
  );
}

export default App;
