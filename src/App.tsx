/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, User, Hash, School, BookOpen, Calendar, Trash2, Image as ImageIcon, Crop as CropIcon, Check, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface StudentData {
  name: string;
  studentNo: string;
  className: string;
  ml: string;
  taDate: string;
}

interface BoxPosition {
  x: number; // 0 to 100 (percentage)
  y: number; // 0 to 100 (percentage)
}

export default function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  
  // Cropper state
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  // Student data state
  const [data, setData] = useState<StudentData>({
    name: '',
    studentNo: '',
    className: '',
    ml: '',
    taDate: '',
  });

  // Box position state (percentage of canvas)
  const [boxPos, setBoxPos] = useState<BoxPosition>({ x: 98, y: 2 }); // Default top-right
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setOriginalImage(result);
        setCroppedImage(result); // Show full image initially
        setIsCropping(false); // Don't force cropping
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setOriginalImage(result);
        setCroppedImage(result); // Show full image initially
        setIsCropping(false); // Don't force cropping
      };
      reader.readAsDataURL(file);
    }
  };

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    // Initialize a free-form crop that covers most of the image
    const initialCrop: Crop = {
      unit: '%',
      x: 5,
      y: 5,
      width: 90,
      height: 90,
    };
    setCrop(initialCrop);
    
    // Also set completed crop initially so they can confirm without moving
    setCompletedCrop({
      unit: 'px',
      x: (width * 0.05),
      y: (height * 0.05),
      width: (width * 0.9),
      height: (height * 0.9),
    });
  }

  const getCroppedImg = async () => {
    if (!originalImage || !completedCrop || !imgRef.current) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL('image/jpeg');
  };

  const handleCropConfirm = async () => {
    const cropped = await getCroppedImg();
    if (cropped) {
      setCroppedImage(cropped);
      setIsCropping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !croppedImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Only draw the info box if there is at least some data
      const hasData = Object.values(data).some(val => typeof val === 'string' && val.trim() !== '');
      if (!hasData) return;

      const padding = canvas.width * 0.02;
      const fontSize = Math.max(16, canvas.width * 0.025);
      const lineHeight = fontSize * 1.4;
      
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textBaseline = 'top';

      const lines = [
        `Student Name: ${data.name}`,
        `Student No.: ${data.studentNo}`,
        `Class: ${data.className}`,
        `ML: ${data.ml}`,
        `TA Date: ${data.taDate}`,
      ];

      const maxTextWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
      const boxWidth = maxTextWidth + padding * 2;
      const boxHeight = lines.length * lineHeight + padding;

      let x = (boxPos.x / 100) * canvas.width;
      let y = (boxPos.y / 100) * canvas.height;

      if (x + boxWidth > canvas.width) x = canvas.width - boxWidth - padding;
      if (y + boxHeight > canvas.height) y = canvas.height - boxHeight - padding;
      if (x < 0) x = padding;
      if (y < 0) y = padding;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(x, y, boxWidth, boxHeight);

      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      lines.forEach((line, index) => {
        ctx.fillText(line, x + padding, y + padding * 0.75 + index * lineHeight);
      });
    };
    img.src = croppedImage;
  }, [croppedImage, data, boxPos]);

  // Handle immediate updates when typing or moving
  useEffect(() => {
    if (croppedImage && canvasRef.current) {
      drawCanvas();
    }
  }, [data, boxPos, drawCanvas, croppedImage]);

  // Handle initial mount or image change with a small delay for animations
  useEffect(() => {
    const timer = setTimeout(() => {
      if (croppedImage && canvasRef.current) {
        drawCanvas();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [croppedImage, drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    handleMouseMove(e);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !previewContainerRef.current) return;

    const rect = previewContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    setBoxPos({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `student_${data.studentNo || 'photo'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const clearAll = () => {
    setOriginalImage(null);
    setCroppedImage(null);
    setIsCropping(false);
    setData({
      name: '',
      studentNo: '',
      className: '',
      ml: '',
      taDate: '',
    });
    setBoxPos({ x: 70, y: 5 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Student Photo Labeler</h1>
            <p className="text-zinc-500 mt-2">Upload, crop, and position student details anywhere on the photo.</p>
          </div>
          {(originalImage || croppedImage) && (
            <div className="flex gap-2">
              <button
                onClick={clearAll}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors text-zinc-600"
              >
                <Trash2 size={18} />
                Clear
              </button>
              {croppedImage && !isCropping && (
                <>
                  <button
                    onClick={() => setIsCropping(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors text-zinc-600"
                  >
                    <CropIcon size={18} />
                    Re-crop
                  </button>
                  <button
                    onClick={downloadImage}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-sm"
                  >
                    <Download size={18} />
                    Download
                  </button>
                </>
              )}
            </div>
          )}
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Section */}
          <section className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <User size={20} className="text-zinc-400" />
                Student Information
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <User size={12} /> Student Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={data.name}
                    onChange={handleInputChange}
                    placeholder="Enter name"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <Hash size={12} /> Student No.
                  </label>
                  <input
                    type="text"
                    name="studentNo"
                    value={data.studentNo}
                    onChange={handleInputChange}
                    placeholder="Enter student number"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <School size={12} /> Class
                  </label>
                  <input
                    type="text"
                    name="className"
                    value={data.className}
                    onChange={handleInputChange}
                    placeholder="Enter class"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <BookOpen size={12} /> ML
                  </label>
                  <input
                    type="text"
                    name="ml"
                    value={data.ml}
                    onChange={handleInputChange}
                    placeholder="Enter ML"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <Calendar size={12} /> TA Date
                  </label>
                  <input
                    type="text"
                    name="taDate"
                    value={data.taDate}
                    onChange={handleInputChange}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
                  />
                </div>
              </div>
            </div>

            {croppedImage && !isCropping && (
              <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-lg space-y-2">
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                  <Move size={14} />
                  Tip
                </div>
                <p className="text-sm leading-relaxed">
                  Click and drag anywhere on the photo to move the student details box.
                </p>
              </div>
            )}
          </section>

          {/* Preview Section */}
          <section className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {!originalImage ? (
                <motion.div
                  key="upload-zone"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video w-full border-2 border-dashed border-zinc-200 rounded-3xl bg-white flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="text-zinc-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-zinc-900">Click or drag photo here</p>
                    <p className="text-sm text-zinc-500">Supports JPG, PNG, WEBP</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </motion.div>
              ) : isCropping ? (
                <motion.div
                  key="cropping-zone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative w-full bg-zinc-900 rounded-3xl overflow-hidden p-4 flex flex-col items-center gap-4"
                >
                  <div className="max-h-[60vh] overflow-auto w-full flex justify-center bg-zinc-800 rounded-xl">
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      onComplete={(c) => setCompletedCrop(c)}
                    >
                      <img
                        ref={imgRef}
                        src={originalImage}
                        onLoad={onImageLoad}
                        alt="Crop source"
                        className="max-w-full h-auto"
                      />
                    </ReactCrop>
                  </div>
                  <div className="flex items-center gap-4 bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl">
                    <p className="text-xs font-bold text-zinc-400 uppercase pr-4 border-r border-zinc-200">
                      Drag corners to resize
                    </p>
                    <button
                      onClick={handleCropConfirm}
                      disabled={!completedCrop?.width || !completedCrop?.height}
                      className="flex items-center gap-2 px-4 py-1.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      <Check size={18} />
                      Confirm Crop
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview-zone"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative bg-white p-4 rounded-3xl shadow-sm border border-zinc-100 overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-zinc-500 text-sm">
                        <ImageIcon size={16} />
                        <span>Preview</span>
                      </div>
                      <button
                        onClick={() => setIsCropping(true)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors text-xs font-medium text-zinc-600"
                      >
                        <CropIcon size={14} />
                        Crop Photo
                      </button>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-300">
                      Drag to Position
                    </span>
                  </div>
                  <div 
                    ref={previewContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                    className="rounded-2xl overflow-hidden bg-zinc-100 flex items-center justify-center cursor-move select-none relative"
                  >
                    <canvas
                      ref={canvasRef}
                      className="max-w-full h-auto shadow-2xl pointer-events-none"
                      style={{ maxHeight: '70vh' }}
                    />
                    <div className="absolute inset-0 bg-transparent" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </main>
      </div>
    </div>
  );
}
