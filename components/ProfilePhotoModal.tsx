'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Camera,
  Upload,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Trash2,
  AlertCircle,
  Video,
  VideoOff,
  User,
} from 'lucide-react';

interface ProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
  onSavePhoto: (dataUrl: string) => void;
  userName?: string;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80',
];

export function ProfilePhotoModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  onSavePhoto,
  userName = 'User',
}: ProfilePhotoModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'presets'>('upload');
  const [previewPhoto, setPreviewPhoto] = useState<string>(currentAvatarUrl || '');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start live camera stream
  const startCamera = async () => {
    setErrorMessage('');
    setCapturedPhoto(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('Camera access is not supported by your browser or environment. Please upload an image file instead.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 640 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission was denied. Please allow camera permissions in your browser or select an image file from your device.');
      } else {
        setErrorMessage('Unable to access camera on this device. Please upload an image file from your device instead.');
      }
      setIsCameraActive(false);
    }
  };

  // Capture photo frame from video to canvas
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth || 320, video.videoHeight || 320);
    canvas.width = 320;
    canvas.height = 320;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Crop to center square
      const startX = ((video.videoWidth || 320) - size) / 2;
      const startY = ((video.videoHeight || 320) - size) / 2;
      ctx.drawImage(video, startX, startY, size, size, 0, 0, 320, 320);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedPhoto(dataUrl);
      setPreviewPhoto(dataUrl);
      stopCamera();
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  // Handle file upload from device with auto-resizing & square center-crop
  const handleDeviceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Image size is too large. Please select a photo under 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const targetDim = 280;
          canvas.width = targetDim;
          canvas.height = targetDim;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const minDim = Math.min(img.naturalWidth || 280, img.naturalHeight || 280);
            const startX = ((img.naturalWidth || 280) - minDim) / 2;
            const startY = ((img.naturalHeight || 280) - minDim) / 2;
            ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetDim, targetDim);
            const compressed = canvas.toDataURL('image/jpeg', 0.88);
            setPreviewPhoto(compressed);
            setCapturedPhoto(null);
          } else {
            setPreviewPhoto(rawDataUrl);
            setCapturedPhoto(null);
          }
        } catch {
          setPreviewPhoto(rawDataUrl);
          setCapturedPhoto(null);
        }
      };
      img.onerror = () => {
        setPreviewPhoto(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file. Please try another file.');
    };
    reader.readAsDataURL(file);
  };

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleSelectTab = (tab: 'upload' | 'camera' | 'presets') => {
    setActiveTab(tab);
    if (tab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  // Sync current avatar on modal open
  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setPreviewPhoto(currentAvatarUrl || '');
        setErrorMessage('');
        setCapturedPhoto(null);
      });
    }
  }, [isOpen, currentAvatarUrl]);

  if (!isOpen) return null;

  const handleApply = () => {
    stopCamera();
    onSavePhoto(previewPhoto);
    onClose();
  };

  const handleRemove = () => {
    stopCamera();
    setPreviewPhoto('');
    setCapturedPhoto(null);
    onSavePhoto('');
    onClose();
  };

  const userInitials = (userName || 'HA')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 shadow-2xl relative animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-5 right-5 rounded-lg p-1 text-[#6B6860] hover:bg-[#F7F6F3] hover:text-[#1A1A1A] transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded bg-[#00319D]/10 px-2 py-0.5 text-[10px] font-bold text-[#00319D]">
              <Camera className="h-3 w-3" />
              Account Indicator Photo
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#1A1A1A]">Update Profile Picture</h3>
          <p className="text-xs text-[#6B6860] mt-0.5">
            Personalize the avatar shown in your top-right account indicator.
          </p>
        </div>

        {/* Live Indicator Preview */}
        <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-4 flex items-center gap-3.5 mb-5">
          <div className="relative">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-[#00319D] text-[#FFFFFF] flex items-center justify-center ring-2 ring-[#00319D]/20 shadow-xs shrink-0">
              {previewPhoto ? (
                <Image
                  src={previewPhoto}
                  alt={userName}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              ) : (
                <span className="text-lg font-extrabold tracking-wide">
                  {userInitials}
                </span>
              )}
            </div>
            <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#1A1A1A]">{userName}</div>
            <p className="text-[11px] text-[#6B6860] mt-0.5">
              {previewPhoto ? 'Custom photo selected' : 'Default initials avatar'}
            </p>
            {previewPhoto && (
              <button
                type="button"
                onClick={() => setPreviewPhoto('')}
                className="text-[10px] font-bold text-rose-600 hover:underline mt-1 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                Remove photo
              </button>
            )}
          </div>
        </div>

        {/* Method Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#F7F6F3] p-1 rounded-lg text-xs font-semibold mb-4 border border-[#E8E6E1]">
          <button
            type="button"
            onClick={() => handleSelectTab('upload')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-[#FFFFFF] text-[#00319D] shadow-xs'
                : 'text-[#6B6860] hover:text-[#1A1A1A]'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            From Device
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('camera')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-[#FFFFFF] text-[#00319D] shadow-xs'
                : 'text-[#6B6860] hover:text-[#1A1A1A]'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            Live Camera
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('presets')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-[#FFFFFF] text-[#00319D] shadow-xs'
                : 'text-[#6B6860] hover:text-[#1A1A1A]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Presets
          </button>
        </div>

        {/* TAB 1: UPLOAD FROM DEVICE OR CAMERA */}
        {activeTab === 'upload' && (
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-[#00319D]/30 bg-[#00319D]/5 p-5 text-center cursor-pointer hover:border-[#00319D] hover:bg-[#00319D]/10 transition-all space-y-1.5"
            >
              <div className="h-9 w-9 rounded-full bg-[#00319D] text-[#FFFFFF] flex items-center justify-center mx-auto shadow-xs">
                <Upload className="h-4 w-4" />
              </div>
              <div className="text-xs font-bold text-[#1A1A1A]">
                Browse photo from device / photo library
              </div>
              <p className="text-[11px] text-[#6B6860]">
                JPG, PNG, WebP automatically optimized for your avatar
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] hover:bg-[#F7F6F3] p-2 text-xs font-semibold text-[#1A1A1A] cursor-pointer transition-colors">
                <Camera className="h-3.5 w-3.5 text-[#00319D]" />
                Snap with Device Camera
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleDeviceUpload}
                  className="hidden"
                />
              </label>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleDeviceUpload}
              className="hidden"
            />
          </div>
        )}

        {/* TAB 2: LIVE CAMERA CAPTURE */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-w-[280px] mx-auto border border-[#E8E6E1] flex items-center justify-center">
              {capturedPhoto ? (
                <Image
                  src={capturedPhoto}
                  alt="Captured snapshot"
                  width={280}
                  height={280}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
                />
              )}

              {!isCameraActive && !capturedPhoto && (
                <div className="p-4 text-center text-white/80 space-y-2">
                  <VideoOff className="h-8 w-8 mx-auto text-white/50" />
                  <p className="text-xs font-medium">Starting camera...</p>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {!capturedPhoto ? (
                <button
                  type="button"
                  disabled={!isCameraActive}
                  onClick={capturePhoto}
                  className="flex items-center gap-1.5 rounded-lg bg-[#00319D] px-4 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  Snap Photo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={retakePhoto}
                  className="flex items-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#F7F6F3] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retake Photo
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PRESETS */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            <p className="text-[11px] text-[#6B6860]">
              Select a professional verified avatar:
            </p>
            <div className="grid grid-cols-3 gap-3">
              {PRESET_AVATARS.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPreviewPhoto(url)}
                  className={`rounded-xl overflow-hidden border-2 p-0.5 transition-all cursor-pointer aspect-square ${
                    previewPhoto === url
                      ? 'border-[#00319D] ring-2 ring-[#00319D]/30 scale-105'
                      : 'border-[#E8E6E1] hover:border-[#00319D]/50'
                  }`}
                >
                  <Image
                    src={url}
                    alt={`Avatar preset ${i + 1}`}
                    width={100}
                    height={100}
                    className="h-full w-full object-cover rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 mt-3 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-[#E8E6E1]">
          {currentAvatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
            >
              Reset to Initials
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="rounded-lg border border-[#E8E6E1] px-3.5 py-1.5 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 rounded-lg bg-[#00319D] px-4 py-1.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              Use This Photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
