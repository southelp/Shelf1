import { useEffect, useRef, useState } from 'react'
import { isIsbn13 } from '../lib/isbn'

declare global { interface Window { BarcodeDetector?: any; Quagga?: any } }

export default function IsbnScanner({ onDetect }:{ onDetect:(isbn:string)=>void }){
  const videoRef = useRef<HTMLVideoElement>(null)
  const [useFallback,setUseFallback] = useState(false)
  const [err,setErr] = useState<string|undefined>()

  useEffect(()=>{ (async()=>{
    try{
      if ('BarcodeDetector' in window) {
        await startNative();
      } else {
        setUseFallback(true); await loadQuagga();
      }
    }catch(e:any){
      // If starting the camera fails set a user-friendly error message.
      setErr(e?.message || 'Unable to start the camera.')
    }
  })() },[])

  async function startNative(){
    const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } })
    if (!videoRef.current) return; videoRef.current.srcObject = stream; await videoRef.current.play()
    const detector = new window.BarcodeDetector({ formats:['ean_13'] })
    const tick = async () => {
      if (!videoRef.current) return; const detections = await detector.detect(videoRef.current).catch(()=>[])
      const code = detections?.[0]?.rawValue; if (code && isIsbn13(code)) { onDetect(code) }
      requestAnimationFrame(tick)
    }; tick()
  }

  async function loadQuagga(){
    if (!window.Quagga) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/quagga@0.12.1/dist/quagga.min.js';
        s.onload = resolve;
        s.onerror = () => reject('Failed to load Quagga');
        document.body.appendChild(s);
      });
    }
    window.Quagga.init({ inputStream:{ name:'Live', type:'LiveStream', target: videoRef.current, constraints:{ facingMode:'environment' } }, decoder:{ readers:['ean_reader'] } }, (err:any)=>{
      if (err){
        // If the scanner cannot be initialised show a friendly error.
        setErr(err.message || 'Scanner error')
        return
      }
      window.Quagga.start();
      window.Quagga.onDetected((res:any)=>{ const code = res?.codeResult?.code; if (code && isIsbn13(code)) onDetect(code) })
    })
  }

  return (
    <div className="card">
      {/* Instruction label */}
      <div className="label" style={{marginBottom:8}}>
        Scan ISBN (EAN‑13) with the camera
      </div>
      <video ref={videoRef} style={{width:'100%',borderRadius:12,background:'#000',aspectRatio:'3/4'}} muted playsInline />
      {err && (
        <div className="label" style={{color:'crimson',marginTop:8}}>
          {err}
        </div>
      )}
    </div>
  )
}
