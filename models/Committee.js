const mongoose = require('mongoose');

const committeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },// اسم اللجنة
    evaluationPhase: {
        type: String,
        enum: ['AnalysisPhase', 'DesignPhase', 'FinalEvaluation'],
        required: true
    } // مرحلة التقييم (تحليلية، تصميمية، نهائية)
}, { timestamps: true });

module.exports = mongoose.model('Committee', committeeSchema);
