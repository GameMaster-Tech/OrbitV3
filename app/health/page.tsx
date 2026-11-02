'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Plus, X, Camera, AlertTriangle, Pill, Apple, Activity, Save, Loader } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/stores/authStore'
import { getHealthProfile, saveHealthProfile } from '@/lib/database'
import { toBase64, cn, formatShortDate } from '@/lib/utils'
import type { Medication } from '@/types'

const fadeUp: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

export default function HealthPage() {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [scanning, setScanning] = useState(false)

  const [allergies, setAllergies] = useState<string[]>([])
  const [conditions, setConditions] = useState<string[]>([])
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [newAllergy, setNewAllergy] = useState('')
  const [newCondition, setNewCondition] = useState('')
  const [newDiet, setNewDiet] = useState('')
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null)
  const [medicationForm, setMedicationForm] = useState({
    name: '',
    dosage: '',
    frequency: '',
    courseLength: '',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    if (!user) return
    getHealthProfile(user.uid).then((p) => {
      if (!p) return
      setAllergies(Array.isArray(p.allergies) ? p.allergies : [])
      setConditions(Array.isArray(p.conditions) ? p.conditions : [])
      setDietaryRestrictions(Array.isArray(p.dietaryRestrictions) ? p.dietaryRestrictions : [])
      setMedications(Array.isArray(p.medications) ? p.medications : [])
    })
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await saveHealthProfile(user.uid, { allergies, conditions, dietaryRestrictions, medications })
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }

  const handleScanPrescription = async (file: File) => {
    setScanning(true)
    try {
      const base64 = await toBase64(file)
      const res = await fetch('/api/ai/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type, mode: 'prescription' }),
      })
      const data = await res.json()
      if (data.medications?.length) {
        const newMeds: Medication[] = data.medications.map((m: { name: string; dosage: string; frequency: string }, i: number) => ({
          id: `med_${Date.now()}_${i}`,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          courseLength: data.courseLength || '7 days',
          startDate: data.startDate ? new Date(data.startDate) : new Date(),
        }))
        setMedications((prev) => [...prev, ...newMeds])
        setEditMode(true)
      }
    } catch (err) {
      console.error('Prescription scan failed', err)
    } finally {
      setScanning(false)
    }
  }

  const addTag = (list: string[], setList: (v: string[]) => void, val: string, clear: () => void) => {
    if (val.trim()) {
      setList([...list, val.trim()])
      clear()
    }
  }

  const resetMedicationForm = () => {
    setMedicationForm({
      name: '',
      dosage: '',
      frequency: '',
      courseLength: '',
      startDate: '',
      endDate: '',
    })
  }

  const addManualMedication = () => {
    if (!medicationForm.name.trim() || !medicationForm.dosage.trim() || !medicationForm.frequency.trim()) return
    setMedications((prev) => [
      ...prev,
      {
        id: `med_manual_${Date.now()}`,
        name: medicationForm.name.trim(),
        dosage: medicationForm.dosage.trim(),
        frequency: medicationForm.frequency.trim(),
        courseLength: medicationForm.courseLength.trim() || 'Ongoing',
        startDate: medicationForm.startDate ? new Date(medicationForm.startDate) : new Date(),
        endDate: medicationForm.endDate ? new Date(medicationForm.endDate) : undefined,
      },
    ])
    resetMedicationForm()
  }

  const SECTIONS = [
    {
      key: 'allergies',
      label: 'Allergies',
      icon: AlertTriangle,
      color: 'text-orbit-critical',
      bg: 'bg-orbit-critical/8',
      items: allergies,
      badgeClass: 'badge-critical',
      newVal: newAllergy,
      setNew: setNewAllergy,
      placeholder: 'e.g. Peanuts, Shellfish',
      onRemove: (i: number) => setAllergies(allergies.filter((_, j) => j !== i)),
      onAdd: () => addTag(allergies, setAllergies, newAllergy, () => setNewAllergy('')),
    },
    {
      key: 'conditions',
      label: 'Conditions',
      icon: Activity,
      color: 'text-orbit-warning',
      bg: 'bg-orbit-warning/8',
      items: conditions,
      badgeClass: 'badge-warning',
      newVal: newCondition,
      setNew: setNewCondition,
      placeholder: 'e.g. Diabetes, Hypertension',
      onRemove: (i: number) => setConditions(conditions.filter((_, j) => j !== i)),
      onAdd: () => addTag(conditions, setConditions, newCondition, () => setNewCondition('')),
    },
    {
      key: 'dietary',
      label: 'Dietary Restrictions',
      icon: Apple,
      color: 'text-orbit-success',
      bg: 'bg-orbit-success/8',
      items: dietaryRestrictions,
      badgeClass: 'badge-success',
      newVal: newDiet,
      setNew: setNewDiet,
      placeholder: 'e.g. Vegan, Gluten-free',
      onRemove: (i: number) => setDietaryRestrictions(dietaryRestrictions.filter((_, j) => j !== i)),
      onAdd: () => addTag(dietaryRestrictions, setDietaryRestrictions, newDiet, () => setNewDiet('')),
    },
  ]

  return (
    <AppShell title="Health" subtitle="Medical profile & medication tracker">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-3xl mx-auto">
        <motion.div variants={fadeUp} className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setEditMode((v) => !v)} className={editMode ? 'btn-primary' : 'btn-ghost'}>
            {editMode ? 'Editing' : 'Edit Profile'}
          </button>
          <label className={cn('btn-ghost gap-1.5 cursor-pointer', scanning && 'opacity-50')}>
            <Camera className="w-3.5 h-3.5" />
            {scanning ? 'Scanning...' : 'Scan Prescription'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleScanPrescription(e.target.files[0])} />
          </label>
          {editMode && (
            <button onClick={handleSave} disabled={saving} className="btn-primary gap-1.5 ml-auto disabled:opacity-40">
              {saving ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save
                </>
              )}
            </button>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Allergies', value: allergies.length, icon: AlertTriangle, accent: 'red' },
            { label: 'Conditions', value: conditions.length, icon: Activity, accent: 'amber' },
            { label: 'Dietary', value: dietaryRestrictions.length, icon: Apple, accent: 'green' },
            { label: 'Medications', value: medications.length, icon: Pill, accent: 'indigo' },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className={cn('card card-md card-accent-' + accent)}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-orbit-muted" />
                <p className="stat-label">{label}</p>
              </div>
              <p className="stat-value">{value}</p>
            </div>
          ))}
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon
            return (
              <motion.div key={sec.key} variants={fadeUp}>
                <div className="card card-md h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', sec.bg)}>
                      <Icon className={cn('w-3.5 h-3.5', sec.color)} />
                    </div>
                    <p className="font-sans text-sm font-semibold text-orbit-text">{sec.label}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
                    {sec.items.length === 0 && <p className="font-sans text-xs text-orbit-dim">None recorded</p>}
                    {sec.items.map((item, i) => (
                      <span key={i} className={cn('badge gap-1', sec.badgeClass)}>
                        {item}
                        {editMode && (
                          <button onClick={() => sec.onRemove(i)} className="hover:opacity-70">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {editMode && (
                    <div className="flex gap-2 mt-3">
                      <input
                        value={sec.newVal}
                        onChange={(e) => sec.setNew(e.target.value)}
                        placeholder={sec.placeholder}
                        className="orbit-input text-sm flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') sec.onAdd()
                        }}
                      />
                      <button onClick={sec.onAdd} className="btn-ghost px-3">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        <motion.div variants={fadeUp}>
          <div className="card card-lg">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-orbit-primary/10 flex items-center justify-center">
                <Pill className="w-4 h-4 text-orbit-primary" />
              </div>
              <p className="font-sans text-sm font-semibold text-orbit-text">Medications</p>
              {medications.length > 0 && <span className="badge badge-primary ml-auto">{medications.length} active</span>}
            </div>

            {editMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                <input
                  className="orbit-input text-sm"
                  placeholder="Medication name *"
                  value={medicationForm.name}
                  onChange={(event) => setMedicationForm((prev) => ({ ...prev, name: event.target.value }))}
                />
                <input
                  className="orbit-input text-sm"
                  placeholder="Dosage *"
                  value={medicationForm.dosage}
                  onChange={(event) => setMedicationForm((prev) => ({ ...prev, dosage: event.target.value }))}
                />
                <input
                  className="orbit-input text-sm"
                  placeholder="Frequency *"
                  value={medicationForm.frequency}
                  onChange={(event) => setMedicationForm((prev) => ({ ...prev, frequency: event.target.value }))}
                />
                <input
                  className="orbit-input text-sm"
                  placeholder="Course length"
                  value={medicationForm.courseLength}
                  onChange={(event) => setMedicationForm((prev) => ({ ...prev, courseLength: event.target.value }))}
                />
                <input
                  className="orbit-input text-sm"
                  type="date"
                  value={medicationForm.startDate}
                  onChange={(event) => setMedicationForm((prev) => ({ ...prev, startDate: event.target.value }))}
                />
                <input
                  className="orbit-input text-sm"
                  type="date"
                  value={medicationForm.endDate}
                  onChange={(event) => setMedicationForm((prev) => ({ ...prev, endDate: event.target.value }))}
                />
                <button className="btn-primary md:col-span-2" onClick={addManualMedication}>
                  Add Medication
                </button>
              </div>
            )}

            {medications.length === 0 ? (
              <div className="text-center py-8">
                <Pill className="w-8 h-8 text-orbit-dim mx-auto mb-2" />
                <p className="font-sans text-sm text-orbit-muted">No medications recorded</p>
                <p className="font-sans text-xs text-orbit-dim mt-1">Scan a prescription or use manual entry in Edit mode</p>
              </div>
            ) : (
              <div className="space-y-2">
                {medications.map((med, i) => (
                  <div
                    key={med.id ?? i}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedMedication(med)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedMedication(med)
                      }
                    }}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-orbit-elevated border border-orbit-border hover:border-orbit-primary/40 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-orbit-primary/10 flex items-center justify-center shrink-0">
                      <Pill className="w-3.5 h-3.5 text-orbit-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm font-semibold text-orbit-text truncate">{med.name}</p>
                      <p className="font-sans text-xs text-orbit-muted">{med.dosage} · {med.frequency}</p>
                      <p className="font-sans text-[11px] text-orbit-dim mt-0.5">
                        {med.courseLength} · Start {formatShortDate(med.startDate)}
                      </p>
                    </div>
                    {editMode && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          setMedications(medications.filter((_, j) => j !== i))
                        }}
                        className="p-1.5 rounded-lg text-orbit-dim hover:text-orbit-critical hover:bg-orbit-critical/8 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        {/* Clinical Disclaimer Banner */}
        <motion.div variants={fadeUp} className="rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-sans text-xs font-semibold text-orbit-text">Informational Domestic Aid Notice</p>
            <p className="font-sans text-xs text-orbit-muted mt-0.5 leading-relaxed">
              Orbit Health Intelligence is an informational household assistant. AI-generated conflict warnings, dietary checks, and prescription extractions are not clinically validated medical advice, diagnosis, or treatment. Always verify conflicts, medication dosages, and health precautions with a licensed healthcare provider.
            </p>
          </div>
        </motion.div>

        </motion.div>

        <AnimatePresence>
          {selectedMedication && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedMedication(null)}>
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 12 }}
                transition={{ duration: 0.2 }}
                onClick={(event) => event.stopPropagation()}
                className="card card-lg w-full max-w-md"
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <p className="section-label mb-1">Medication Details</p>
                    <p className="font-sans text-base font-semibold text-orbit-text">{selectedMedication.name}</p>
                  </div>
                  <button onClick={() => setSelectedMedication(null)} className="btn-ghost p-2 text-orbit-text border border-orbit-border">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-orbit-elevated">
                    <span className="font-sans text-xs text-orbit-muted">Dosage</span>
                    <span className="font-sans text-xs font-semibold text-orbit-text">{selectedMedication.dosage}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-orbit-elevated">
                    <span className="font-sans text-xs text-orbit-muted">Frequency</span>
                    <span className="font-sans text-xs font-semibold text-orbit-text">{selectedMedication.frequency}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-orbit-elevated">
                    <span className="font-sans text-xs text-orbit-muted">Course length</span>
                    <span className="font-sans text-xs font-semibold text-orbit-text">{selectedMedication.courseLength}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-orbit-elevated">
                    <span className="font-sans text-xs text-orbit-muted">Start date</span>
                    <span className="font-sans text-xs font-semibold text-orbit-text">{formatShortDate(selectedMedication.startDate)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-orbit-elevated">
                    <span className="font-sans text-xs text-orbit-muted">End date</span>
                    <span className="font-sans text-xs font-semibold text-orbit-text">
                      {selectedMedication.endDate ? formatShortDate(selectedMedication.endDate) : 'Not set'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AppShell>
  )
}

