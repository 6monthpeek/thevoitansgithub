"use client";

import { useEffect, useRef } from "react";

export default function AdvancedTeamCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl") as WebGLRenderingContext;
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    // Simülasyon parametreleri
    const SIM_RESOLUTION = 128;
    const DYE_RESOLUTION = 1440;
    const CAPTURE_RESOLUTION = 512;
    const DENSITY_DISSIPATION = 3.5;
    const VELOCITY_DISSIPATION = 2;
    const PRESSURE = 0.1;
    const PRESSURE_ITERATIONS = 20;
    const CURL = 10;
    const SPLAT_RADIUS = 0.5;
    const SPLAT_FORCE = 6000;
    const SHADING = true;
    const COLOR_UPDATE_SPEED = 10;

    // Mobil cihazlarda performans için DYE_RESOLUTION'ı dinamik olarak ayarlamak için bir bayrak
    let isMobile = false;
    // Mobilde kullanılacak daha düşük çözünürlük
    const MOBILE_DYE_RESOLUTION = 720;

    // Etkinlik durumunu takip etmek için değişkenler
    let isPointerActive = false;
    let lastX = 0;
    let lastY = 0;

    // --- WebGL Shader'lar ---
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

    // --- WebGL Fonksiyonları ---
    function createShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type);
      if (!shader) return null;
      
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader | null, fragmentShader: WebGLShader | null) {
      if (!vertexShader || !fragmentShader) return null;
      
      const program = gl.createProgram();
      if (!program) return null;
      
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
      }
      return program;
    }

    function createTexture(gl: WebGLRenderingContext, width: number, height: number) {
      const texture = gl.createTexture();
      if (!texture) return null;
      
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    }

    function createFramebuffer(gl: WebGLRenderingContext, texture: WebGLTexture | null) {
      if (!texture) return null;
      
      const framebuffer = gl.createFramebuffer();
      if (!framebuffer) return null;
      
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return framebuffer;
    }

    // --- Simülasyon Başlatma ---
    let program: WebGLProgram | null = null;
    let positionBuffer: WebGLBuffer | null = null;
    let densityTexture: WebGLTexture | null = null;
    let velocityTexture: WebGLTexture | null = null;
    let densityFramebuffer: WebGLFramebuffer | null = null;
    let velocityFramebuffer: WebGLFramebuffer | null = null;
    let timeUniform: WebGLUniformLocation | null = null;
    let densityTextureUniform: WebGLUniformLocation | null = null;
    let velocityTextureUniform: WebGLUniformLocation | null = null;
    let shadingUniform: WebGLUniformLocation | null = null;

    let currentDensityTexture: WebGLTexture | null = null;
    let currentVelocityTexture: WebGLTexture | null = null;

    function initWebGL() {
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      program = createProgram(gl, vertexShader, fragmentShader);

      const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1,
      ]);
      
      positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      const dyeResolution = isMobile ? MOBILE_DYE_RESOLUTION : DYE_RESOLUTION;
      const simResolution = SIM_RESOLUTION;

      densityTexture = createTexture(gl, dyeResolution, dyeResolution);
      velocityTexture = createTexture(gl, simResolution, simResolution);

      densityFramebuffer = createFramebuffer(gl, densityTexture);
      velocityFramebuffer = createFramebuffer(gl, velocityTexture);

      currentDensityTexture = densityTexture;
      currentVelocityTexture = velocityTexture;

      if (program) {
        timeUniform = gl.getUniformLocation(program, "u_time");
        densityTextureUniform = gl.getUniformLocation(program, "u_densityTexture");
        velocityTextureUniform = gl.getUniformLocation(program, "u_velocityTexture");
        shadingUniform = gl.getUniformLocation(program, "u_shading");
      }
    }

    // --- Render Döngüsü ---
    let animationFrameId: number | null = null;
    let startTime = Date.now();

    function render() {
      if (!gl || !program || !canvas) return;

      const currentTime = (Date.now() - startTime) / 1000;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      const positionLocation = gl.getAttribLocation(program, "a_position");
      if (positionLocation !== -1 && positionBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      }

      if (currentDensityTexture && densityTextureUniform) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, currentDensityTexture);
        gl.uniform1i(densityTextureUniform, 0);
      }

      if (currentVelocityTexture && velocityTextureUniform) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, currentVelocityTexture);
        gl.uniform1i(velocityTextureUniform, 1);
      }

      if (timeUniform) gl.uniform1f(timeUniform, currentTime);
      if (shadingUniform) gl.uniform1i(shadingUniform, SHADING ? 1 : 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (isPointerActive) {
        animationFrameId = requestAnimationFrame(render);
      }
    }

    // --- Olay Dinleyicileri ---
    function handleMouseMove(e: MouseEvent) {
      if (!canvas) return;
      isPointerActive = true;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      lastX = x;
      lastY = y;
      
      if (!animationFrameId) {
        render();
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (!canvas) return;
      e.preventDefault();
      if (e.touches.length > 0) {
        isPointerActive = true;
        const rect = canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        lastX = x;
        lastY = y;
        
        if (!animationFrameId) {
          render();
        }
      }
    }

    function handlePointerUpOrLeave() {
      setTimeout(() => {
        if (!isPointerActive) {
          // Fare durunca render döngüsü duracak
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
        }
      }, 100);
    }

    // --- Canvas Boyutlandırma ---
    function resizeCanvas() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    }

    // --- Başlatma ve Temizlik ---
    function init() {
      if (!canvas) return;
      isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      resizeCanvas();
      initWebGL();

      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
      canvas.addEventListener("mouseup", handlePointerUpOrLeave);
      canvas.addEventListener("mouseleave", handlePointerUpOrLeave);
      window.addEventListener("resize", resizeCanvas);

      render();
    }

    function cleanup() {
      if (!canvas) return;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("mouseup", handlePointerUpOrLeave);
      canvas.removeEventListener("mouseleave", handlePointerUpOrLeave);
      window.removeEventListener("resize", resizeCanvas);
    }

    init();

    return () => {
      cleanup();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-[9999]"
      style={{ display: "block" }}
    />
  );
}
