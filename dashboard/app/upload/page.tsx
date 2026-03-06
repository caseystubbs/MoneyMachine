"use client"

import { useState } from "react"

export default function UploadPage() {
  const [file,setFile] = useState<File | null>(null)
  const [msg,setMsg] = useState("")

  async function upload(){
    if(!file){
      setMsg("Select a CSV first")
      return
    }

    const form = new FormData()
    form.append("file",file)

    const res = await fetch("/api/upload-transactions",{
      method:"POST",
      body:form
    })

    const data = await res.json()
    setMsg(JSON.stringify(data))
  }

  return (
    <div style={{padding:40}}>
      <h1>Upload CSV</h1>

      <input
        type="file"
        accept=".csv"
        onChange={(e)=>setFile(e.target.files?.[0] || null)}
      />

      <br/><br/>

      <button onClick={upload}>
        Upload
      </button>

      <p>{msg}</p>
    </div>
  )
}