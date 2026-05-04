// JobHunt Web Clipper - Popup Script
const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

document.getElementById('saveBtn').addEventListener('click', async () => {
  const btn = document.getElementById('saveBtn')
  const status = document.getElementById('status')
  
  const jobData = {
    title: document.getElementById('jobTitle').value,
    company: document.getElementById('company').value,
    description: document.getElementById('description').value,
    url: window.location.href,
    source: 'web-clipper',
    scraped_at: new Date().toISOString()
  }
  
  if (!jobData.title || !jobData.company) {
    status.textContent = 'Veuillez remplir le titre et l\'entreprise'
    status.className = 'status error'
    return
  }
  
  btn.disabled = true
  btn.textContent = 'Sauvegarde...'
  
  try {
    const response = await fetch(`${API_URL}/rest/v1/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(jobData)
    })
    
    if (response.ok) {
      status.textContent = '✓ Sauvegardé dans JobHunt!'
      status.className = 'status success'
      setTimeout(() => window.close(), 2000)
    } else {
      throw new Error('Failed to save')
    }
  } catch (e) {
    status.textContent = 'Erreur: ' + e.message
    status.className = 'status error'
  }
  
  btn.disabled = false
  btn.textContent = 'Sauvegarder → JobHunt'
})

// Auto-detect job info from page
(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    
    // Try to extract job info from page
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const getText = (selector) => {
          const el = document.querySelector(selector)
          return el ? el.textContent.trim() : ''
        }
        
        return {
          title: getText('h1, [class*="title"], [class*="job-title"]') || document.title,
          company: getText('[class*="company"], [class*="employeur"]'),
          description: getText('[class*="description"], [class*="detail"], article')
        }
      }
    })
    
    if (results && results[0]?.result) {
      const data = results[0].result
      if (data.title && document.getElementById('jobTitle').value === '') {
        document.getElementById('jobTitle').value = data.title
      }
      if (data.company && document.getElementById('company').value === '') {
        document.getElementById('company').value = data.company
      }
      if (data.description && document.getElementById('description').value === '') {
        document.getElementById('description').value = data.description.slice(0, 500)
      }
    }
  } catch (e) {
    console.log('Auto-detect failed:', e)
  }
})()