"use client";

import { useEffect, useRef, useState } from "react";

// WebGL Fluid Simulation - Advanced.team Flame Trail Cursor Effect
// Bu component, fare veya dokunmatik hareketi takip eden bir alev-trail efekti oluşturur.

export default function WebGLFluidCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simülasyon parametreleri
  const SIM_RESOLUTION = 128;
  const DYE_RESOLUTION = 1440;
  const MOBILE_DYE_RESOLUTION = 720;
  const DENSITY_DISSIPATION = 3.5;
  const VELOCITY_DISSIPATION = 2;
  const PRESSURE = 0.1;
  const PRESSURE_ITERATIONS = 20;
  const CURL = 10;
  const SPLAT_RADIUS = 0.5;
  const SPLAT_FORCE = 6000;
  const SHADING = true;
  const COLOR_UPDATE_SPEED = 10;

  // Etkinlik durumunu takip etmek için değişkenler
  const isPointerActive = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const animationFrameId = useRef<number | null>(null);
  const startTime = useRef(Date.now());

  // WebGL Shader'lar
  const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = (a_position + 1.0) * 0.5;
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_densityTexture;
    uniform sampler2D u_velocityTexture;
    uniform float u_time;
    uniform bool u_shading;

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
        vec4 density = texture2D(u_densityTexture, v_texCoord);
        vec4 velocity = texture2D(u_velocityTexture, v_texCoord);

        vec3 color = density.rgb;

        if (u_shading) {
            float speed = length(velocity.xy);
            color += speed * 0.1;
        }

        float hue = mod(u_time * 0.05 + density.r * 0.5, 1.0);
        vec3 hsvColor = vec3(hue, 0.8, 1.0);
        color = mix(color, hsv2rgb(hsvColor), 0.7);

        gl_FragColor = vec4(color, density.a);
    }
  `;

  // Shader derleme fonksiyonu
  const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  };

  // Program oluşturma fonksiyonu
  const createProgram = (gl: WebGLRenderingContext, vertexShader: WebGLShader | null, fragmentShader: WebGLShader | null) => {
    if (!vertexShader || !fragmentShader) return null;
    
    const program = gl.createProgram();
    if (!program) return null;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  };

  // Texture oluşturma fonksiyonu
  const createTexture = (gl: WebGLRenderingContext, width: number, height: number) => {
    const texture = gl.createTexture();
    if (!texture) return null;
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    return texture;
  };

  // Framebuffer oluşturma fonksiyonu
  const createFramebuffer = (gl: WebGLRenderingContext, texture: WebGLTexture | null) => {
    if (!texture) return null;
    
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) return null;
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    
    return framebuffer;
  };

  // WebGL'i başlat
  const initWebGL = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // Shader'ları oluştur
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) {
      console.error('Failed to create program');
      return;
    }

    // Vertex buffer'ı (fullscreen quad için)
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Texture boyutlarını belirle
    const dyeResolution = isMobile ? MOBILE_DYE_RESOLUTION : DYE_RESOLUTION;
    const simResolution = SIM_RESOLUTION;

    // Yoğunluk ve hız texture'larını oluştur
    const densityTexture = createTexture(gl, dyeResolution, dyeResolution);
    const velocityTexture = createTexture(gl, simResolution, simResolution);

    // Ping-Pong buffer'ları için texture'lar
    const pingPongDensityTexture1 = createTexture(gl, dyeResolution, dyeResolution);
    const pingPongDensityTexture2 = createTexture(gl, dyeResolution, dyeResolution);
    const pingPongVelocityTexture1 = createTexture(gl, simResolution, simResolution);
    const pingPongVelocityTexture2 = createTexture(gl, simResolution, simResolution);

    // Uniform'ları al
    const timeUniform = gl.getUniformLocation(program, 'u_time');
    const densityTextureUniform = gl.getUniformLocation(program, 'u_densityTexture');
    const velocityTextureUniform = gl.getUniformLocation(program, 'u_velocityTexture');
    const shadingUniform = gl.getUniformLocation(program, 'u_shading');

    // Render döngüsü
    const render = () => {
      if (!gl || !program) return;

      const currentTime = (Date.now() - startTime.current) / 1000;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      // Vertex buffer'ı bağla
      const positionLocation = gl.getAttribLocation(program, 'a_position');
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Texture'ları bağla
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, densityTexture);
      gl.uniform1i(densityTextureUniform, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, velocityTexture);
      gl.uniform1i(velocityTextureUniform, 1);

      // Uniform'ları ayarla
      gl.uniform1f(timeUniform, currentTime);
      gl.uniform1i(shadingUniform, SHADING ? 1 : 0);

      // Çiz
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (isPointerActive.current) {
        animationFrameId.current = requestAnimationFrame(render);
      }
    };

    // Fare hareketini işle
    const handleMouseMove = (e: MouseEvent) => {
      isPointerActive.current = true;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      lastX.current = x;
      lastY.current = y;
      
      if (!animationFrameId.current) {
        render();
      }
    };

    // Dokunmatik hareketi işle
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        isPointerActive.current = true;
        const rect = canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        lastX.current = x;
        lastY.current = y;
        
        if (!animationFrameId.current) {
          render();
        }
      }
    };

    // Fare bırakıldığında
    const handlePointerUpOrLeave = () => {
      setTimeout(() => {
        if (!isPointerActive.current) {
          isPointerActive.current = false;
        }
      }, 100);
    };

    // Olay dinleyicilerini ekle
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('mouseup', handlePointerUpOrLeave);
    canvas.addEventListener('mouseleave', handlePointerUpOrLeave);

    // İlk render'ı başlat
    render();

    // Temizlik fonksiyonu
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('mouseup', handlePointerUpOrLeave);
      canvas.removeEventListener('mouseleave', handlePointerUpOrLeave);
    };
  };

  // Canvas boyutlandırma
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  useEffect(() => {
    // Cihaz tipini kontrol et
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

    // Canvas boyutlandırma
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // WebGL'i başlat
    const cleanup = initWebGL();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (cleanup) cleanup();
    };
  }, [isMobile]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
