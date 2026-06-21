'use client'

interface Props {
  show: boolean
  onOk: () => void
}

export default function InfoModal({ show, onOk }: Props) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] px-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 animate-[scaleIn_0.25s_ease-out]">
        <div className="flex justify-center mb-4">
          <img src="/Y logo.png" alt="Y" className="w-14 h-14 md:w-16 md:h-16 object-contain" />
        </div>

        <div className="text-sm md:text-base text-gray-800 leading-relaxed space-y-3">
          <p>
            <strong className="text-amber-700">Y సెర్చ్</strong> అన్ని పోలింగ్ స్టేషన్ల నుండి డేటాను సేకరిస్తోంది.
            దీనికి కొంత సమయం పడుతుంది. దయచేసి ఓపికగా వేచి ఉండండి.
          </p>
          <p>
            మేము ఉపయోగిస్తున్న డేటా{' '}
            <a href="https://ceoaperolls.ap.gov.in" target="_blank" rel="noopener noreferrer"
               className="text-amber-600 underline font-medium">CEO ఆంధ్రప్రదేశ్</a>{' '}
            ప్రభుత్వ వెబ్‌సైట్ నుండి తీసుకోబడింది. ఈ డేటా పూర్తిగా{' '}
            <strong>విద్యా ప్రయోజనాల</strong> కోసం మాత్రమే ఉపయోగించబడుతోంది.
            ఎలాంటి డేటా లీక్ కాదు, మీ సమాచారం పూర్తిగా సురక్షితం.
          </p>
          <p className="text-amber-700 font-medium text-right">
            - యాసిర్
          </p>
        </div>

        <button
          className="mt-5 w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
          onClick={onOk}
        >
          సరే (OK)
        </button>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
