import React from 'react';
import { CheckCircle } from 'lucide-react';
import Card from './Card';

interface Step {
  number: number;
  title: string;
  icon: React.ComponentType<any>;
}

interface StepProgressProps {
  currentStep: number;
  steps: Step[];
}

const StepProgress: React.FC<StepProgressProps> = ({ currentStep, steps }) => {
  return (
    <Card className="overflow-hidden w-full">
      {/* Mobile Layout */}
      <div className="block md:hidden">
        {/* Current Step Display */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white min-h-[44px] min-w-[44px]">
              {React.createElement(steps[currentStep - 1]?.icon, { className: "w-6 h-6" })}
            </div>
            <div>
              <p className="text-sm font-medium text-blue-600">
                Step {currentStep} of {steps.length}
              </p>
              <p className="text-xs text-gray-600">
                {steps[currentStep - 1]?.title}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mt-3 px-2">
          {steps.map((step, index) => (
            <div key={step.number} className="flex flex-col items-center">
              <div className={`
                w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 min-h-[32px] min-w-[32px] sm:min-h-[40px] sm:min-w-[40px] flex-shrink-0
                ${currentStep >= step.number 
                  ? 'bg-blue-500 border-blue-500' 
                  : 'border-gray-300 bg-white'
                }
              `}>
                {currentStep >= step.number && (
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                )}
              </div>
              <span className={`
                text-xs mt-1 font-medium max-w-[50px] sm:max-w-[60px] text-center leading-tight
                ${currentStep >= step.number ? 'text-blue-600' : 'text-gray-400'}
              `}>
                {step.title.length > 8 ? step.title.split(' ')[0] : step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex items-center min-w-0">
                <div className={`
                  flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 flex-shrink-0 min-h-[44px] min-w-[44px]
                  ${currentStep >= step.number 
                    ? 'bg-blue-500 border-blue-500 text-white shadow-lg' 
                    : 'border-gray-300 text-gray-500 bg-white'
                  }
                `}>
                  <step.icon className="w-6 h-6" />
                </div>
                <div className="ml-4 min-w-0">
                  <p className={`text-sm font-semibold transition-colors duration-200 ${
                    currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    Step {step.number}
                  </p>
                  <p className={`text-sm transition-colors duration-200 ${
                    currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </p>
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className="flex-1 mx-6 min-w-[40px]">
                  <div className={`
                    h-1 rounded-full transition-all duration-300 ease-out
                    ${currentStep > step.number ? 'bg-blue-500' : 'bg-gray-200'}
                  `} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Tablet Layout */}
      <div className="hidden sm:block md:hidden">
        <div className="space-y-4">
          {/* Current Step Highlight */}
          <div className="flex items-center justify-center space-x-4 p-3 sm:p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white min-h-[44px] min-w-[44px]">
              {React.createElement(steps[currentStep - 1]?.icon, { className: "w-6 h-6" })}
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-blue-600">
                {steps[currentStep - 1]?.title}
              </p>
              <p className="text-sm text-gray-600">
                Step {currentStep} of {steps.length}
              </p>
            </div>
          </div>

          {/* All Steps Overview */}
          <div className="grid grid-cols-5 gap-1 sm:gap-2 px-2">
            {steps.map((step, index) => (
              <div key={step.number} className="flex flex-col items-center space-y-2">
                <div className={`
                  w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex-shrink-0
                  ${currentStep >= step.number 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'border-gray-300 text-gray-500 bg-white'
                  }
                `}>
                  <step.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className={`
                  text-xs font-medium text-center leading-tight max-w-[60px] break-words
                  ${currentStep >= step.number ? 'text-blue-600' : 'text-gray-400'}
                `}>
                  {step.title}
                </span>
                {currentStep >= step.number && (
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                )}
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StepProgress;