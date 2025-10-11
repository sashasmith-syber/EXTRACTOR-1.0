import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
// Fix: Module '@google/genai' has no exported members 'TextPart' or 'ImagePart'. The correct type for content parts is 'Part'.
import { GoogleGenAI, Type, Part } from '@google/genai';

interface SAPSAnalysis {
  coreSoundscape: string;
  rhythmicElements: string;
  melodicAndHarmonicElements: string;
  soundEffectsAndFoley: string;
}

interface CMSIAnalysis {
  colorToSound: string;
  textureToSound: string;
  compositionToSound: string;
}

interface StructuredPrompt {
  mainSubject: string;
  setting: string;
  styleAndMood: string;
  composition: string;
  actionAndMotion?: string;
  semanticThemes: string;
  cmsiAnalysis: CMSIAnalysis;
  sapsAnalysis: SAPSAnalysis;
  fullPrompt: string;
}

interface StructuredMusicPrompt {
    genre: string;
    mood: string;
    moodVariations: string[];
    tempoBPM: string;
    keyElements: string[];
    instrumentation: string[];
    structureAndArrangement: string;
    fxAndProductionNotes: string[];
    finalPrompt: string;
}

const App = () => {
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    dataUrl: string;
    type: 'image' | 'video' | 'gif';
  } | null>(null);
  const [structuredPrompt, setStructuredPrompt] = useState<StructuredPrompt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Generating...');
  const [error, setError] = useState<string | null>(null);
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [promptHistory, setPromptHistory] = useState<StructuredPrompt[]>([]);
  
  const [multimodalPrompts, setMultimodalPrompts] = useState<{ story?: string; music?: string; threeD?: string; }>({});
  const [isMultimodalLoading, setIsMultimodalLoading] = useState<string | null>(null); // 'story', 'music', or 'threeD'
  const [multimodalCopyStatus, setMultimodalCopyStatus] = useState<{ [key: string]: string }>({});
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isImageGenerating, setIsImageGenerating] = useState(false);

  const [promptVariations, setPromptVariations] = useState<string[]>([]);
  const [isVariationsLoading, setIsVariationsLoading] = useState(false);

  const [optimizationInstruction, setOptimizationInstruction] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [originalFullPrompt, setOriginalFullPrompt] = useState<string | null>(null);

  const [selectedMusicStyle, setSelectedMusicStyle] = useState<'House Music' | 'Deep House' | 'Drum \'n\' Bass' | 'Techno' | 'Trance' | 'Ambient' | 'Synthwave' | null>(null);
  const [musicPrompt, setMusicPrompt] = useState<StructuredMusicPrompt | null>(null);
  const [isMusicPromptLoading, setIsMusicPromptLoading] = useState(false);
  const [musicPromptCopyText, setMusicPromptCopyText] = useState('Copy');
  const [garCustomizationInput, setGarCustomizationInput] = useState('');
  const [originalMusicPrompt, setOriginalMusicPrompt] = useState<StructuredMusicPrompt | null>(null);
  const [musicPromptRefinementInstruction, setMusicPromptRefinementInstruction] = useState('');
  const [isMusicPromptRefining, setIsMusicPromptRefining] = useState(false);
  const [isDPMUpdating, setIsDPMUpdating] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('promptHistory');
      if (storedHistory) {
        setPromptHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error('Failed to parse prompt history from localStorage', error);
      setPromptHistory([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('promptHistory', JSON.stringify(promptHistory));
    } catch (error) {
      console.error('Failed to save prompt history to localStorage', error);
    }
  }, [promptHistory]);
  
  const resetState = () => {
    setSelectedFile(null);
    setStructuredPrompt(null);
    setError(null);
    setImageUrlInput('');
    setMultimodalPrompts({});
    setGeneratedImage(null);
    setPromptVariations([]);
    setOptimizationInstruction('');
    setIsOptimizing(false);
    setOriginalFullPrompt(null);
    setSelectedMusicStyle(null);
    setMusicPrompt(null);
    setGarCustomizationInput('');
    setOriginalMusicPrompt(null);
    setMusicPromptRefinementInstruction('');
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleModeChange = (mode: 'upload' | 'url') => {
    setInputMode(mode);
    resetState();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileType = file.type.split('/')[0];
      const simpleType = file.type === 'image/gif' ? 'gif' : fileType === 'video' ? 'video' : 'image';

      if (simpleType !== 'image' && simpleType !== 'video' && simpleType !== 'gif') {
        setError('Please select a valid image, GIF, or video file.');
        return;
      }
      
      setError(null);
      setStructuredPrompt(null);
      setMultimodalPrompts({});
      setGeneratedImage(null);
      setPromptVariations([]);
      setOriginalFullPrompt(null);
      setMusicPrompt(null);
      setSelectedMusicStyle(null);
      setGarCustomizationInput('');
      setOriginalMusicPrompt(null);
      setMusicPromptRefinementInstruction('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile({ file, dataUrl: reader.result as string, type: simpleType });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoadFromUrl = async () => {
    if (!imageUrlInput.trim()) {
        setError('Please enter a valid image URL.');
        return;
    }

    setIsLoading(true);
    setLoadingMessage('Loading image from URL...');
    setError(null);
    setStructuredPrompt(null);
    setSelectedFile(null);
    setMultimodalPrompts({});
    setGeneratedImage(null);
    setPromptVariations([]);
    setOriginalFullPrompt(null);
    setMusicPrompt(null);
    setSelectedMusicStyle(null);
    setGarCustomizationInput('');
    setOriginalMusicPrompt(null);
    setMusicPromptRefinementInstruction('');

    try {
        // Using a CORS proxy for fetching images from URLs
        const response = await fetch(`https://cors-anywhere.herokuapp.com/${imageUrlInput}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch image. Status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            throw new Error('The URL does not point to a valid image file. Video URLs are not supported.');
        }

        const blob = await response.blob();
        const file = new File([blob], "image_from_url", { type: blob.type });
        const simpleType = file.type === 'image/gif' ? 'gif' : 'image';


        const reader = new FileReader();
        reader.onloadend = () => {
            setSelectedFile({ file, dataUrl: reader.result as string, type: simpleType });
        };
        reader.readAsDataURL(file);

    } catch (err) {
        console.error(err);
        setError('Failed to load image from URL. Please check the URL and try again. A CORS proxy is used, which may have restrictions.');
    } finally {
        setIsLoading(false);
    }
  };


  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const extractFramesFromVideo = (videoFile: File, numFrames: number = 8): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const frames: string[] = [];

        if (!ctx) {
            return reject(new Error('Canvas 2D context is not available.'));
        }

        const videoUrl = URL.createObjectURL(videoFile);
        video.src = videoUrl;
        video.muted = true;

        video.onloadeddata = async () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const duration = video.duration;
            if (duration <= 0) {
              URL.revokeObjectURL(videoUrl);
              return reject(new Error('Video has no duration or is invalid.'));
            }
            const interval = duration / numFrames;

            for (let i = 0; i < numFrames; i++) {
                const seekTime = i * interval;
                video.currentTime = seekTime;
                
                await new Promise<void>(res => {
                    const onSeeked = () => {
                        video.removeEventListener('seeked', onSeeked);
                        res();
                    };
                    video.addEventListener('seeked', onSeeked);
                });

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const base64String = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                frames.push(base64String);
            }
            
            URL.revokeObjectURL(videoUrl);
            resolve(frames);
        };

        video.onerror = () => {
            URL.revokeObjectURL(videoUrl);
            reject(new Error('Failed to load video file.'));
        };

        video.load(); 
    });
};

  const handleGeneratePrompt = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Generating...');
    setError(null);
    setStructuredPrompt(null);
    setMultimodalPrompts({});
    setGeneratedImage(null);
    setPromptVariations([]);
    setOriginalFullPrompt(null);
    setMusicPrompt(null);
    setSelectedMusicStyle(null);
    setGarCustomizationInput('');
    setOriginalMusicPrompt(null);
    setMusicPromptRefinementInstruction('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      let contentParts: Part[] = [];
      let systemInstruction = '';
      let responseSchema: any = {};
      
      const sapsSchema = {
        type: Type.OBJECT,
        description: "Structured Audio Prompt Schema (SAPS) analysis, breaking down the sonic translation of the scene into distinct layers.",
        properties: {
            coreSoundscape: { type: Type.STRING, description: "Describes the foundational, atmospheric, and ambient layer of the sound." },
            rhythmicElements: { type: Type.STRING, description: "Describes the percussion, rhythmic patterns, and tempo." },
            melodicAndHarmonicElements: { type: Type.STRING, description: "Describes the melodies, chords, and basslines." },
            soundEffectsAndFoley: { type: Type.STRING, description: "Describes specific, discrete, non-musical sound events." }
        },
        required: ['coreSoundscape', 'rhythmicElements', 'melodicAndHarmonicElements', 'soundEffectsAndFoley']
      };

      const cmsiSchema = {
        type: Type.OBJECT,
        description: "Cross-Modal Semantic Interpreter analysis, mapping visual elements to sonic concepts.",
        properties: {
            colorToSound: { type: Type.STRING, description: "How the image's color palette translates to musical harmony and mood." },
            textureToSound: { type: Type.STRING, description: "How visual textures (e.g., rough, smooth) translate to sonic character (e.g., distortion, reverb)." },
            compositionToSound: { type: Type.STRING, description: "How compositional elements (e.g., lines, shapes) translate to rhythm and structure." }
        },
        required: ['colorToSound', 'textureToSound', 'compositionToSound']
      };

      if (selectedFile.type === 'video') {
          setLoadingMessage('Extracting frames...');
          const frames = await extractFramesFromVideo(selectedFile.file);
          contentParts = frames.map(frameData => ({
              inlineData: { mimeType: 'image/jpeg', data: frameData }
          }));
          
          contentParts.push({
              text: `This is a sequence of frames from a short video. Analyze the entire sequence to understand motion and narrative. First, perform a standard visual analysis. Second, perform a CMSI analysis. Third, based on the CMSI, perform a SAPS analysis. Finally, combine everything into a single, cohesive prompt.`
          });

          systemInstruction = `You are "The Visual Prompt Extractor," an advanced AI specialized in meticulously analyzing visual content (images AND video frames) and translating them into highly detailed prompts. Your output must be a valid JSON object.
          
**Your Core Directives for Video Analysis:**
1.  **Temporal Analysis:** Scrutinize the sequence of frames to identify movement, character actions, changes in the environment, and the overall flow of events.
2.  **Cross-Modal Semantic Interpretation (CMSI):** Perform a CMSI analysis. This is critical. Translate the video's dominant colors, textures, and compositional flow into musical/sonic concepts.
3.  **Structured Audio Prompt Schema (SAPS):** Based on the CMSI, generate a SAPS report. This breaks down the sonic translation into four concrete layers: core soundscape, rhythmic elements, melodic/harmonic elements, and sound effects/foley.
4.  **Identify Key Moment:** Synthesize your analysis into a prompt that captures the single most compelling, representative, or climactic moment of the video. The final prompt should describe a static scene.
5.  **Adhere to Schema:** Populate all fields in the JSON schema. The 'fullPrompt' should be a cohesive paragraph for a text-to-image model.`;

          responseSchema = {
              type: Type.OBJECT,
              properties: {
                  mainSubject: { type: Type.STRING, description: 'A detailed description of the main subject(s) as they appear in the key moment.' },
                  setting: { type: Type.STRING, description: 'A description of the background and environment.' },
                  styleAndMood: { type: Type.STRING, description: 'The artistic style, mood, lighting, and color palette.' },
                  composition: { type: Type.STRING, description: 'Details about the composition and camera work (e.g., tracking shot, static, zoom).' },
                  actionAndMotion: { type: Type.STRING, description: 'A description of the key actions, movements, and dynamic forces in the scene.' },
                  semanticThemes: { type: Type.STRING, description: 'Keywords describing the abstract themes and emotions (e.g., escape, pursuit, celebration).' },
                  cmsiAnalysis: cmsiSchema,
                  sapsAnalysis: sapsSchema,
                  fullPrompt: { type: Type.STRING, description: 'A complete, single-paragraph prompt for an image generation model, capturing the peak moment.' }
              },
              required: ['mainSubject', 'setting', 'styleAndMood', 'composition', 'actionAndMotion', 'semanticThemes', 'cmsiAnalysis', 'sapsAnalysis', 'fullPrompt']
          };

      } else { // Image or GIF
          setLoadingMessage('Analyzing image...');
          const base64Data = await fileToBase64(selectedFile.file);
          const imagePart = { inlineData: { mimeType: selectedFile.file.type, data: base64Data } };
          const textPart = { text: `Describe this image in full detail. First, perform a standard visual analysis. Second, perform a CMSI analysis. Third, based on the CMSI, perform a SAPS analysis. Finally, provide a complete, combined prompt for an image generation AI.` };
          contentParts = [imagePart, textPart];
          
          systemInstruction = `You are "The Visual Prompt Extractor," an advanced AI specialized in meticulously analyzing visual content (images) and translating them into highly detailed text prompts. Your output must be a valid JSON object that adheres to the provided schema.

**Your Core Directives:**
1.  **Comprehensive Visual Analysis:** Scrutinize all elements within the image: subjects, objects, colors, textures, lighting, and composition.
2.  **Cross-Modal Semantic Interpretation (CMSI):** This is a critical step. You must perform a CMSI analysis, translating the image's visual properties into analogous musical or sonic concepts (e.g., 'warm colors suggest a major key').
3.  **Structured Audio Prompt Schema (SAPS):** After the CMSI, you MUST generate a SAPS report. This translates the abstract CMSI concepts into concrete audio layers:
    -   **coreSoundscape:** The foundational, atmospheric layer (e.g., 'A warm, evolving synth pad').
    -   **rhythmicElements:** Percussion and patterns (e.g., 'A slow, steady electronic kick drum').
    -   **melodicAndHarmonicElements:** Melodies, chords, basslines (e.g., 'A simple, melancholic piano melody').
    -   **soundEffectsAndFoley:** Specific, discrete sounds (e.g., 'The distant sound of rain').
4.  **Extract Semantic Meaning:** Go beyond literal description. Identify and articulate the underlying abstract themes and emotions.
5.  **Adhere to Schema:** Populate all fields in the JSON schema. The 'fullPrompt' should be a cohesive paragraph for a text-to-image model.`;

          responseSchema = {
              type: Type.OBJECT,
              properties: {
                  mainSubject: { type: Type.STRING, description: 'A detailed description of the main subject(s) of the image.' },
                  setting: { type: Type.STRING, description: 'A description of the background, environment, and setting.' },
                  styleAndMood: { type: Type.STRING, description: 'The artistic style, mood, lighting, and color palette.' },
                  composition: { type: Type.STRING, description: 'Details about the composition, camera angle, and framing.' },
                  semanticThemes: { type: Type.STRING, description: 'A list of comma-separated keywords describing the abstract themes, emotions, and core concepts of the image.' },
                  cmsiAnalysis: cmsiSchema,
                  sapsAnalysis: sapsSchema,
                  fullPrompt: { type: Type.STRING, description: 'A complete, single-paragraph prompt combining all elements, ready for an image generation model.' }
              },
              required: ['mainSubject', 'setting', 'styleAndMood', 'composition', 'semanticThemes', 'cmsiAnalysis', 'sapsAnalysis', 'fullPrompt']
          };
      }
      
      setLoadingMessage('Generating...');
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: contentParts },
        config: {
          systemInstruction,
          temperature: 0.7,
          topP: 0.95,
          responseMimeType: "application/json",
          responseSchema,
        },
      });

      const jsonString = response.text;
      const parsedPrompt: StructuredPrompt = JSON.parse(jsonString);
      
      setStructuredPrompt(parsedPrompt);
      setOriginalFullPrompt(parsedPrompt.fullPrompt);
      
      if (parsedPrompt) {
        setPromptHistory((prevHistory) => [parsedPrompt, ...prevHistory]);
      }

    } catch (err) {
      console.error(err);
      setError(
        'Failed to generate prompt. This might be due to a network issue, an invalid file, or safety restrictions. Please check the console for details.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!structuredPrompt) return;

    setIsImageGenerating(true);
    setGeneratedImage(null);
    setError(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: structuredPrompt.fullPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
            },
        });

        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
        setGeneratedImage(imageUrl);

    } catch (err) {
        console.error(err);
        setError('Failed to generate image. Please try again.');
    } finally {
        setIsImageGenerating(false);
    }
  };

  const handleGenerateMultimodalPrompt = async (modality: 'story' | 'music' | 'threeD') => {
    if (!structuredPrompt) return;

    setIsMultimodalLoading(modality);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      let userPrompt = '';
      switch (modality) {
          case 'story':
              userPrompt = `Based on the following detailed image description, write a compelling opening paragraph for a story:\n\n"${structuredPrompt.fullPrompt}"`;
              break;
          case 'music':
              userPrompt = `Based on the following detailed image description, create a detailed prompt for a music generation AI. Describe the genre, mood, tempo, and key instruments that would compose the soundtrack for this scene:\n\n"${structuredPrompt.fullPrompt}"`;
              break;
          case 'threeD':
              userPrompt = `Based on the following detailed image description, write a detailed prompt for a text-to-3D-model generation AI. Focus on the geometry, textures, materials, and specific details needed to create the main subject as a 3D asset:\n\n"${structuredPrompt.fullPrompt}"`;
              break;
      }

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userPrompt,
          config: {
              temperature: 0.8,
              topP: 0.95,
          }
      });

      setMultimodalPrompts(prev => ({ ...prev, [modality]: response.text }));

    } catch (err) {
      console.error(err);
      setError(`Failed to generate ${modality} prompt. Please try again.`);
    } finally {
      setIsMultimodalLoading(null);
    }
  };

  const handleGenerateVariations = async () => {
    if (!structuredPrompt) return;

    setIsVariationsLoading(true);
    setPromptVariations([]);
    setError(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
        const userPrompt = `Based on the following image generation prompt, create 3 alternative versions. Each version should be distinct, exploring different phrasing, focusing on different details, or adopting a slightly different stylistic tone. Return a JSON object with a "variations" key containing an array of these new prompt strings.

Original prompt: "${structuredPrompt.fullPrompt}"`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                variations: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                        description: "An alternative version of the prompt."
                    }
                }
            },
            required: ['variations']
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                temperature: 0.85,
                topP: 0.95,
                responseMimeType: "application/json",
                responseSchema,
            }
        });

        const jsonString = response.text;
        const parsedResponse = JSON.parse(jsonString);
        
        if (parsedResponse.variations && Array.isArray(parsedResponse.variations)) {
            setPromptVariations(parsedResponse.variations);
        } else {
            throw new Error("Invalid response format from API.");
        }

    } catch (err) {
        console.error(err);
        setError('Failed to generate prompt variations. Please try again.');
    } finally {
        setIsVariationsLoading(false);
    }
  };
  
  const handleSelectVariation = (variation: string) => {
    if (!structuredPrompt) return;
    const newPromptData = { ...structuredPrompt, fullPrompt: variation };
    setStructuredPrompt(newPromptData);
    setOriginalFullPrompt(variation);
    
    setPromptHistory(prev => {
        const newHistory = [...prev];
        if (newHistory.length > 0) {
            newHistory[0] = newPromptData;
        }
        return newHistory;
    });
    
    setMultimodalPrompts({});
    setGeneratedImage(null);
    setMusicPrompt(null);
    setSelectedMusicStyle(null);
    setGarCustomizationInput('');
    setOriginalMusicPrompt(null);
    setMusicPromptRefinementInstruction('');
  };
  
  const handleOptimizePrompt = async () => {
    if (!structuredPrompt || !optimizationInstruction.trim()) return;

    setIsOptimizing(true);
    setError(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

        const userPrompt = `You are a prompt refiner. Your task is to take an existing image generation prompt and modify it based on a user's instruction, while preserving the core subject matter. The output should be only the refined prompt text, without any preamble or explanation.

Original Prompt:
"${structuredPrompt.fullPrompt}"

User's Instruction:
"${optimizationInstruction}"

Refined Prompt:`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                temperature: 0.7,
                topP: 0.9,
            }
        });

        const newFullPrompt = response.text.trim();
        const newPromptData = { ...structuredPrompt, fullPrompt: newFullPrompt };
        setStructuredPrompt(newPromptData);
        setOptimizationInstruction('');
        setGeneratedImage(null);
        setMultimodalPrompts({});
        setMusicPrompt(null);
        setSelectedMusicStyle(null);
        setGarCustomizationInput('');
        setOriginalMusicPrompt(null);
        setMusicPromptRefinementInstruction('');

        setPromptHistory(prev => {
            const newHistory = [...prev];
            if (newHistory.length > 0) {
                newHistory[0] = newPromptData;
            }
            return newHistory;
        });

    } catch (err) {
        console.error(err);
        setError('Failed to optimize prompt. Please try again.');
    } finally {
        setIsOptimizing(false);
    }
  };

  const handleRevertPrompt = () => {
    if (!structuredPrompt || !originalFullPrompt) return;

    const revertedPromptData = { ...structuredPrompt, fullPrompt: originalFullPrompt };
    setStructuredPrompt(revertedPromptData);

    setGeneratedImage(null);
    setMultimodalPrompts({});
    setMusicPrompt(null);
    setSelectedMusicStyle(null);
    setGarCustomizationInput('');
    setOriginalMusicPrompt(null);
    setMusicPromptRefinementInstruction('');

    setPromptHistory(prev => {
        const newHistory = [...prev];
        if (newHistory.length > 0) {
            newHistory[0] = revertedPromptData;
        }
        return newHistory;
    });
  };


  const handleCopy = () => {
    if (!structuredPrompt) return;
    navigator.clipboard.writeText(structuredPrompt.fullPrompt).then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy'), 2000);
    });
  };
  
  const handleMultimodalCopy = (text: string, modality: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
          setMultimodalCopyStatus(prev => ({ ...prev, [modality]: 'Copied!' }));
          setTimeout(() => {
              setMultimodalCopyStatus(prev => ({ ...prev, [modality]: 'Copy' }));
          }, 2000);
      });
  };

  const handleHistoryItemClick = (prompt: StructuredPrompt) => {
    setStructuredPrompt(prompt);
    setOriginalFullPrompt(prompt.fullPrompt);
    setMultimodalPrompts({});
    setGeneratedImage(null);
    setPromptVariations([]);
    setMusicPrompt(null);
    setSelectedMusicStyle(null);
    setGarCustomizationInput('');
    setOriginalMusicPrompt(null);
    setMusicPromptRefinementInstruction('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the entire prompt history? This action cannot be undone.')) {
        setPromptHistory([]);
    }
  };

  const handleGenerateMusicPrompt = async () => {
    if (!structuredPrompt || !selectedMusicStyle) return;

    setIsMusicPromptLoading(true);
    setError(null);
    setMusicPrompt(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
        const systemInstruction = `You are "EXTRACTOR AI," a specialized module designed to translate visual input into detailed, genre-specific music generation prompts. You are powered by the integrated GENRE ARCHETYPE REPOSITORY (G.A.R.).

YOUR CORE TASK:
Your primary inputs are the Structured Audio Prompt Schema (SAPS) and the Cross-Modal Semantic Interpreter (CMSI) analysis. Use these to form the foundation of your musical ideas. Then, use the image description, semantic themes, chosen music style, and user customizations to build upon this foundation, mapping the SAPS layers to genre-specific elements from the G.A.R. Your final output must be a comprehensive, structured JSON object that also includes a synthesized, actionable 'finalPrompt'.

YOUR PROCESS & OUTPUT SCHEMA:
1.  **SAPS & CMSI Foundation:** Start with the provided **SAPS** and **CMSI** analysis. This is your most important input. The SAPS provides the blueprint for the soundscape.
2.  **Semantic Core Analysis:** Use the **Semantic Themes** to refine the core 'mood' established by the CMSI.
3.  **Generate Mood Variations:** Based on the primary mood, generate an array of 3-4 alternative, related moods for the 'moodVariations' field.
4.  **G.A.R. Integration:** Map the SAPS layers to the chosen genre's G.A.R. profile. For example, map SAPS 'rhythmicElements' to a 'Four-on-the-floor kick' for House Music. Use this mapping to populate the structured fields.
5.  **User Customization:** Prioritize and integrate any user-provided G.A.R. customizations.
6.  **Synthesize:** Combine all the structured elements into a cohesive, single-paragraph 'finalPrompt'.
7.  **Output:** Your output MUST be a valid JSON object adhering to the specified schema.

--- GENRE ARCHETYPE REPOSITORY (G.A.R.) DATA ---

**STYLE: House Music**
*   **Rhythmic Signature:** Four-on-the-floor kick, off-beat hi-hats, shuffle grooves, syncopated basslines. Tempo: 120-130 BPM.
*   **Timbral Palette:** 909-style drums, analog synth pads/basses, filtered vocal chops, M1 piano, Rhodes piano.
*   **Arrangement Schemas:** Gradual build-ups, breakdowns, energetic drops, repetitive loops.
*   **Harmonic/Melodic Idiom:** Jazzy sevenths/ninths chords, soulful, uplifting phrasing.

**STYLE: Deep House**
*   **Rhythmic Signature:** Smooth, laid-back four-on-the-floor, intricate percussion. Hypnotic, resonant basslines. Tempo: 110-120 BPM.
*   **Timbral Palette:** Lush, atmospheric pads, deep warm sub-bass, soft-attack synth chords, gentle Rhodes keys, reverb-heavy vocal samples.
*   **Arrangement Schemas:** Long, flowing transitions, minimalist builds, continuous journey.
*   **Harmonic/Melodic Idiom:** Minor keys, melancholic or introspective chord progressions.

**STYLE: Drum 'n' Bass**
*   **Rhythmic Signature:** Fast, complex, syncopated breakbeats. High-tempo drums vs half-time bassline. Tempo: 160-180 BPM.
*   **Timbral Palette:** Heavy, distorted, modulated sub-bass (Reese bass). Aggressive, futuristic synth leads. Crisp, processed drums.
*   **Arrangement Schemas:** High-energy intros, powerful drops, complex drum fills, tension-building breakdowns.
*   **Harmonic/Melodic Idiom:** Can range from aggressive riffs to complex, melodic "liquid" styles. Futuristic or dark scales.

**STYLE: Techno**
*   **Rhythmic Signature:** Driving, hypnotic four-on-the-floor kick. Repetitive, machine-like grooves. Prominent claps/snares on 2 & 4. Tempo: 125-140 BPM.
*   **Timbral Palette:** Industrial, futuristic. TR-909/808 drums. Distorted, filtered synth textures. Atonal, metallic sounds.
*   **Arrangement Schemas:** Long, gradual, subtle progressions. Adding/subtracting layers to build tension. Continuous, evolving journey.
*   **Harmonic/Melodic Idiom:** Often atonal or focuses on single-note, repetitive riffs. Simple, hypnotic, often acidic melodies (TB-303). Rhythm and texture are primary.

**STYLE: Trance**
*   **Rhythmic Signature:** Fast four-on-the-floor kick. Rolling or arpeggiated 16th-note basslines. Tempo: 130-145 BPM.
*   **Timbral Palette:** Lush, epic, atmospheric pads. "Supersaw" synth leads. Ethereal, wordless female vocals with heavy reverb/delay.
*   **Arrangement Schemas:** Long, emotional breakdowns (pads/melody only), dramatic tension builds (snare rolls, filter sweeps), leading to a euphoric, energetic "drop".
*   **Harmonic/Melodic Idiom:** Highly melodic and emotional. Memorable, anthemic lead melodies. Uplifting, minor-key chord progressions.

**STYLE: Ambient**
*   **Rhythmic Signature:** Often beatless, or very subtle, slow rhythmic pulses. Percussion is textural. Tempo is non-existent or extremely slow.
*   **Timbral Palette:** Sustained pads, evolving drones, atmospheric textures. Field recordings, granular synthesis. Cavernous reverb and long delays.
*   **Arrangement Schemas:** Non-linear, formless, fluid. Focuses on creating a soundscape. Changes are gradual and imperceptible.
*   **Harmonic/Melodic Idiom:** Melody is absent or presented as slow, simple, drifting phrases. Slow-changing, sustained chords and drones. Mood is the primary goal.

**STYLE: Synthwave**
*   **Rhythmic Signature:** Classic 80s drum machine sounds (LinnDrum, DMX), gated reverb snare. Simple, driving rock-influenced four-on-the-floor. Tempo: 80-120 BPM.
*   **Timbral Palette:** Sounds from 80s analog/digital synths (DX7, Juno-106). Arpeggiated basslines, soaring lead synths, warm pads, brass stabs.
*   **Arrangement Schemas:** Follows traditional pop/rock song structures (verse, chorus, bridge). Often features a synth solo.
*   **Harmonic/Melodic Idiom:** Strong focus on memorable melodies and nostalgic chord progressions. Evokes 80s sci-fi/action film soundtracks.
`;
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                genre: { type: Type.STRING, description: "The selected music genre." },
                mood: { type: Type.STRING, description: "A description of the overall mood and feeling, derived from the image's semantic themes." },
                moodVariations: { 
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "An array of 3-4 alternative, but related, moods." 
                },
                tempoBPM: { type: Type.STRING, description: "The suggested tempo or BPM range, appropriate for the genre and mood. Must be a single number (e.g. '120') or a range (e.g. '110-120')." },
                keyElements: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "An array of 2-4 strings describing the core rhythmic and melodic components."
                },
                instrumentation: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "An array of strings listing key instruments and their desired sonic character, citing G.A.R. examples."
                },
                structureAndArrangement: {
                    type: Type.STRING,
                    description: "A brief description of the potential song structure, based on G.A.R. schemas."
                },
                fxAndProductionNotes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "An array of strings detailing production techniques or effects (e.g., reverb, delay, compression)."
                },
                finalPrompt: {
                    type: Type.STRING,
                    description: "A complete, single-paragraph prompt synthesizing all the above elements, ready for a music generation AI."
                }
            },
            required: ['genre', 'mood', 'moodVariations', 'tempoBPM', 'keyElements', 'instrumentation', 'structureAndArrangement', 'fxAndProductionNotes', 'finalPrompt']
        };
        
        const customizationText = garCustomizationInput.trim() 
            ? `\n\nUser's G.A.R. Customization:\n"${garCustomizationInput.trim()}"\nIncorporate these specific user-defined characteristics, giving them priority while blending them with the core genre archetypes.`
            : '';

        const cmsiText = structuredPrompt.cmsiAnalysis 
            ? `
Cross-Modal Semantic Interpretation (CMSI):
- Color to Sound: ${structuredPrompt.cmsiAnalysis.colorToSound}
- Texture to Sound: ${structuredPrompt.cmsiAnalysis.textureToSound}
- Composition to Sound: ${structuredPrompt.cmsiAnalysis.compositionToSound}
` 
            : '';
        
        const sapsText = structuredPrompt.sapsAnalysis
            ? `
Structured Audio Prompt Schema (SAPS) (PRIMARY BLUEPRINT):
- Core Soundscape: ${structuredPrompt.sapsAnalysis.coreSoundscape}
- Rhythmic Elements: ${structuredPrompt.sapsAnalysis.rhythmicElements}
- Melodic & Harmonic Elements: ${structuredPrompt.sapsAnalysis.melodicAndHarmonicElements}
- Sound Effects & Foley: ${structuredPrompt.sapsAnalysis.soundEffectsAndFoley}
`
            : '';

        const userPrompt = `
${cmsiText}
${sapsText}
Image Description:
"${structuredPrompt.fullPrompt}"

Semantic Themes & Keywords:
"${structuredPrompt.semanticThemes}"

Chosen Music Style:
"${selectedMusicStyle}"
${customizationText}
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction,
                temperature: 0.8,
                responseMimeType: "application/json",
                responseSchema,
            }
        });

        const jsonString = response.text;
        const generatedPrompt: StructuredMusicPrompt = JSON.parse(jsonString);
        setMusicPrompt(generatedPrompt);
        setOriginalMusicPrompt(generatedPrompt);


    } catch (err) {
        console.error(err);
        setError('Failed to generate music prompt. Please try again.');
    } finally {
        setIsMusicPromptLoading(false);
    }
  };

  const handleMusicPromptCopy = () => {
    if (!musicPrompt) return;
    navigator.clipboard.writeText(musicPrompt.finalPrompt).then(() => {
        setMusicPromptCopyText('Copied!');
        setTimeout(() => setMusicPromptCopyText('Copy'), 2000);
    });
  };

  const handleRefineMusicPrompt = async () => {
    if (!musicPrompt || !musicPromptRefinementInstruction.trim()) return;

    setIsMusicPromptRefining(true);
    setError(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

        const userPrompt = `You are a music prompt refiner. Your task is to take an existing music generation prompt and modify it based on a user's instruction, while preserving the core genre and mood. The output should be only the refined prompt text, without any preamble or explanation.

Original Music Prompt:
"${musicPrompt.finalPrompt}"

User's Instruction:
"${musicPromptRefinementInstruction}"

Refined Music Prompt:`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                temperature: 0.75,
            }
        });

        const newFinalPrompt = response.text.trim();
        setMusicPrompt(prev => prev ? { ...prev, finalPrompt: newFinalPrompt } : null);
        setMusicPromptRefinementInstruction(''); 

    } catch (err) {
        console.error(err);
        setError('Failed to refine music prompt. Please try again.');
    } finally {
        setIsMusicPromptRefining(false);
    }
  };

  const handleRevertMusicPrompt = () => {
    if (!originalMusicPrompt) return;
    setMusicPrompt(originalMusicPrompt);
  };
  
  const handleDPMChange = async (parameter: 'mood' | 'tempoBPM', value: string) => {
    if (!musicPrompt) return;

    setIsDPMUpdating(true);
    setError(null);

    const updatedPromptData = { ...musicPrompt, [parameter]: value };
    setMusicPrompt(updatedPromptData);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
        const systemInstruction = `You are a music prompt synthesizer. Your task is to take a set of structured musical elements and synthesize them into a single, cohesive paragraph. The output must be ONLY the final paragraph, with no preamble.`;

        const userPrompt = `
Synthesize a final music prompt paragraph based on the following structured data:

- Genre: ${updatedPromptData.genre}
- Mood: ${updatedPromptData.mood}
- Tempo/BPM: ${updatedPromptData.tempoBPM}
- Key Elements: ${updatedPromptData.keyElements.join(', ')}
- Instrumentation: ${updatedPromptData.instrumentation.join(', ')}
- Structure/Arrangement: ${updatedPromptData.structureAndArrangement}
- FX/Production Notes: ${updatedPromptData.fxAndProductionNotes.join(', ')}

Final Synthesized Prompt:
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction,
                temperature: 0.75,
            }
        });

        const newFinalPrompt = response.text.trim();
        setMusicPrompt(prev => prev ? { ...prev, finalPrompt: newFinalPrompt } : null);
        
        // Also update the original prompt if it's the first DPM change
        if (originalMusicPrompt?.finalPrompt === musicPrompt.finalPrompt) {
            setOriginalMusicPrompt(prev => prev ? { ...prev, finalPrompt: newFinalPrompt } : null);
        }

    } catch (err) {
        console.error("Failed to update prompt with DPM:", err);
        setError("Failed to update prompt. Please try again.");
        // Revert the change on error
        setMusicPrompt(musicPrompt);
    } finally {
        setIsDPMUpdating(false);
    }
  };


  return (
    <div className="app-container">
      <header>
        <h1>Image to Prompt Generator</h1>
        <p>Upload an image, GIF, or video to generate a detailed prompt.</p>
      </header>

      <main>
        <div className="card">
          <div className="input-mode-switcher">
            <button 
                className={`mode-button ${inputMode === 'upload' ? 'active' : ''}`}
                onClick={() => handleModeChange('upload')}
                aria-pressed={inputMode === 'upload'}>
                Upload File
            </button>
            <button 
                className={`mode-button ${inputMode === 'url' ? 'active' : ''}`}
                onClick={() => handleModeChange('url')}
                aria-pressed={inputMode === 'url'}>
                Image URL
            </button>
          </div>

          {inputMode === 'upload' && (
            <div className="upload-section">
              <input
                type="file"
                id="file-input"
                accept="image/png, image/jpeg, image/webp, image/gif, video/mp4, video/webm"
                onChange={handleFileChange}
                ref={fileInputRef}
                aria-label="Upload an image, GIF, or video"
              />
              <label htmlFor="file-input" className="file-input-label">
                {selectedFile ? 'Change File' : 'Upload Image, GIF, or Video'}
              </label>
            </div>
          )}
          
          {inputMode === 'url' && (
             <div className="url-input-section">
                <input
                    type="text"
                    className="url-input"
                    placeholder="Paste image URL here..."
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    aria-label="Image URL input"
                />
                <button className="load-url-button" onClick={handleLoadFromUrl} disabled={isLoading}>
                    Load Image
                </button>
             </div>
          )}

          {selectedFile && (
            <div className="preview-container">
                 {selectedFile.type === 'video' ? (
                    <video
                        src={selectedFile.dataUrl}
                        className="video-preview"
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        aria-label="Video preview"
                    />
                ) : (
                    <img
                        src={selectedFile.dataUrl}
                        alt="Selected preview"
                        className="image-preview"
                    />
                )}
            </div>
          )}
          
          <button
            className="generate-button"
            onClick={handleGeneratePrompt}
            disabled={!selectedFile || isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? loadingMessage : 'Generate Prompt'}
          </button>
        </div>

        {error && <div className="error-message" role="alert">{error}</div>}

        <div className="card">
          <div className="output-section">
            <div className="output-header">
                <h2>Generated Prompt</h2>
                {structuredPrompt && !isLoading && (
                    <button className="copy-button" onClick={handleCopy}>
                        {copyButtonText}
                    </button>
                )}
            </div>
            <div id="prompt-output" aria-live="polite">
              {structuredPrompt && !isLoading && (
                <div className="structured-output">
                  <dl>
                    <dt>Main Subject</dt>
                    <dd>{structuredPrompt.mainSubject}</dd>
                    <dt>Setting</dt>
                    <dd>{structuredPrompt.setting}</dd>
                    <dt>Style & Mood</dt>
                    <dd>{structuredPrompt.styleAndMood}</dd>
                     {structuredPrompt.actionAndMotion && (
                        <>
                            <dt>Action & Motion</dt>
                            <dd>{structuredPrompt.actionAndMotion}</dd>
                        </>
                    )}
                    <dt>Composition</dt>
                    <dd>{structuredPrompt.composition}</dd>
                    <dt>Semantic Themes</dt>
                    <dd>{structuredPrompt.semanticThemes}</dd>
                  </dl>

                  {structuredPrompt.cmsiAnalysis && (
                    <div className="cmsi-analysis-section">
                        <h4>Cross-Modal Semantic Interpreter (CMSI)</h4>
                        <dl>
                            <dt>Color → Sound</dt>
                            <dd>{structuredPrompt.cmsiAnalysis.colorToSound}</dd>
                            <dt>Texture → Sound</dt>
                            <dd>{structuredPrompt.cmsiAnalysis.textureToSound}</dd>
                            <dt>Composition → Sound</dt>
                            <dd>{structuredPrompt.cmsiAnalysis.compositionToSound}</dd>
                        </dl>
                    </div>
                  )}

                  {structuredPrompt.sapsAnalysis && (
                    <div className="saps-analysis-section">
                        <h4>Structured Audio Prompt Schema (SAPS)</h4>
                        <dl>
                            <dt>Core Soundscape</dt>
                            <dd>{structuredPrompt.sapsAnalysis.coreSoundscape}</dd>
                            <dt>Rhythmic Elements</dt>
                            <dd>{structuredPrompt.sapsAnalysis.rhythmicElements}</dd>
                            <dt>Melodic/Harmonic</dt>
                            <dd>{structuredPrompt.sapsAnalysis.melodicAndHarmonicElements}</dd>
                             <dt>Sound FX/Foley</dt>
                            <dd>{structuredPrompt.sapsAnalysis.soundEffectsAndFoley}</dd>
                        </dl>
                    </div>
                  )}

                  <div className="full-prompt-section">
                    <h4>Full Prompt</h4>
                    <p>{structuredPrompt.fullPrompt}</p>
                  </div>

                  <div className="prompt-optimizer-section">
                      <h4>Optimize Prompt</h4>
                      <p className="optimizer-description">Refine the prompt with your own instructions (e.g., "make it more cinematic", "focus on the foreground").</p>
                      <div className="optimizer-input-group">
                          <input
                              type="text"
                              className="optimizer-input"
                              placeholder="Enter instruction..."
                              value={optimizationInstruction}
                              onChange={(e) => setOptimizationInstruction(e.target.value)}
                              disabled={isOptimizing}
                              onKeyDown={(e) => e.key === 'Enter' && handleOptimizePrompt()}
                          />
                          <button
                              className="optimizer-button"
                              onClick={handleOptimizePrompt}
                              disabled={isOptimizing || !optimizationInstruction.trim()}
                          >
                              {isOptimizing ? 'Optimizing...' : 'Optimize'}
                          </button>
                      </div>
                      {structuredPrompt.fullPrompt !== originalFullPrompt && originalFullPrompt &&(
                          <button className="revert-button" onClick={handleRevertPrompt}>
                              Revert to Original
                          </button>
                      )}
                  </div>

                </div>
              )}
              {!structuredPrompt && !isLoading && (
                <div className="placeholder-text">Generated prompt will appear here...</div>
              )}
            </div>
            {isLoading && (
              <div className="loader-container" aria-label={`Loading: ${loadingMessage}`}>
                <div className="spinner"></div>
                <p>{loadingMessage}</p>
              </div>
            )}
          </div>
          
          {structuredPrompt && !isLoading && (
            <div className="variations-section">
              <button
                className="multimodal-button"
                onClick={handleGenerateVariations}
                disabled={isVariationsLoading}
              >
                {isVariationsLoading ? 'Generating...' : '✨ Generate Variations'}
              </button>
              {isVariationsLoading && (
                <div className="loader-container-inline">
                  <div className="spinner-small"></div>
                  <p>Thinking of some alternatives...</p>
                </div>
              )}
              {promptVariations.length > 0 && !isVariationsLoading && (
                <div className="variations-list">
                  <h3>Variations</h3>
                  <ul>
                    {promptVariations.map((variation, index) => (
                      <li key={index} className={`variation-item ${variation === structuredPrompt.fullPrompt ? 'active' : ''}`}>
                        <p>{variation}</p>
                        {variation !== structuredPrompt.fullPrompt ? (
                          <button className="use-variation-button" onClick={() => handleSelectVariation(variation)}>
                            Use This Prompt
                          </button>
                        ) : (
                          <span className="active-prompt-indicator">✓ In Use</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {structuredPrompt && !isLoading && (
            <div className="card">
                <div className="image-generation-section">
                    <h2>Image Generation</h2>
                    <p className="image-generation-description">Use the prompt above to generate a new image.</p>
                    <button
                        className="generate-button"
                        onClick={handleGenerateImage}
                        disabled={isImageGenerating}
                    >
                        {isImageGenerating ? 'Generating Image...' : 'Generate Image'}
                    </button>
                    {isImageGenerating && (
                        <div className="loader-container">
                            <div className="spinner"></div>
                            <p>Generating Image...</p>
                        </div>
                    )}
                    {generatedImage && !isImageGenerating && (
                        <div className="generated-image-container">
                            <img src={generatedImage} alt="Generated from prompt" className="generated-image" />
                        </div>
                    )}
                </div>
            </div>
        )}

        {structuredPrompt && !isLoading && (
            <div className="card">
                <div className="multimodal-section">
                    <h2>Multimodal Prompts</h2>
                    <p className="multimodal-description">Generate specialized prompts for other creative AI models based on your image.</p>
                    <div className="multimodal-actions">
                        <button className="multimodal-button" onClick={() => handleGenerateMultimodalPrompt('story')} disabled={!!isMultimodalLoading}>
                           {isMultimodalLoading === 'story' ? 'Generating...' : 'Generate Story Prompt'}
                        </button>
                        <button className="multimodal-button" onClick={() => handleGenerateMultimodalPrompt('music')} disabled={!!isMultimodalLoading}>
                            {isMultimodalLoading === 'music' ? 'Generating...' : 'Generate Music Prompt'}
                        </button>
                        <button className="multimodal-button" onClick={() => handleGenerateMultimodalPrompt('threeD')} disabled={!!isMultimodalLoading}>
                            {isMultimodalLoading === 'threeD' ? 'Generating...' : 'Generate 3D Model Prompt'}
                        </button>
                    </div>
                    <div className="multimodal-outputs">
                        {multimodalPrompts.story && (
                            <div className="multimodal-output-item">
                                <div className="output-header">
                                    <h3>Story Prompt</h3>
                                    <button className="copy-button" onClick={() => handleMultimodalCopy(multimodalPrompts.story!, 'story')}>
                                        {multimodalCopyStatus.story || 'Copy'}
                                    </button>
                                </div>
                                <p>{multimodalPrompts.story}</p>
                            </div>
                        )}
                        {multimodalPrompts.music && (
                             <div className="multimodal-output-item">
                                <div className="output-header">
                                    <h3>Music Prompt</h3>
                                    <button className="copy-button" onClick={() => handleMultimodalCopy(multimodalPrompts.music!, 'music')}>
                                        {multimodalCopyStatus.music || 'Copy'}
                                    </button>
                                </div>
                                <p>{multimodalPrompts.music}</p>
                            </div>
                        )}
                        {multimodalPrompts.threeD && (
                             <div className="multimodal-output-item">
                                <div className="output-header">
                                    <h3>3D Model Prompt</h3>
                                    <button className="copy-button" onClick={() => handleMultimodalCopy(multimodalPrompts.threeD!, 'threeD')}>
                                        {multimodalCopyStatus.threeD || 'Copy'}
                                    </button>
                                </div>
                                <p>{multimodalPrompts.threeD}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {structuredPrompt && !isLoading && (
            <div className="card">
                <div className="extractor-ai-section">
                    <h2>EXTRACTOR AI: Music Prompt Generator</h2>
                    <p className="multimodal-description">Select an electronic music style to generate a detailed music prompt based on your image.</p>
                    
                    <div className="music-style-selector">
                        {(['House Music', 'Deep House', 'Drum \'n\' Bass', 'Techno', 'Trance', 'Ambient', 'Synthwave'] as const).map(style => (
                            <button
                                key={style}
                                className={`style-button ${selectedMusicStyle === style ? 'active' : ''}`}
                                onClick={() => setSelectedMusicStyle(style)}
                                aria-pressed={selectedMusicStyle === style}
                            >
                                {style}
                            </button>
                        ))}
                    </div>

                    <div className="gar-customization-section">
                        <label htmlFor="gar-customization-input" className="gar-customization-label">
                            Customize G.A.R. (Optional)
                        </label>
                        <textarea
                            id="gar-customization-input"
                            className="gar-customization-textarea"
                            placeholder="e.g., add a lo-fi vinyl crackle, use a specific synth sound like a moog bass, make the drums more aggressive..."
                            value={garCustomizationInput}
                            onChange={(e) => setGarCustomizationInput(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <button
                        className="generate-button"
                        onClick={handleGenerateMusicPrompt}
                        disabled={!selectedMusicStyle || isMusicPromptLoading}
                    >
                        {isMusicPromptLoading ? 'Generating Music Prompt...' : 'Generate Music Prompt'}
                    </button>

                    {isMusicPromptLoading && (
                        <div className="loader-container-inline">
                            <div className="spinner-small"></div>
                            <p>Creating your soundscape...</p>
                        </div>
                    )}
                    
                    {musicPrompt && !isMusicPromptLoading && (
                        <div className="multimodal-output-item">
                            <div className="output-header">
                                <h3>{selectedMusicStyle} Prompt Analysis</h3>
                                <button className="copy-button" onClick={handleMusicPromptCopy}>
                                    {musicPromptCopyText}
                                </button>
                            </div>
                            
                            <div className="structured-music-output">
                                <dl>
                                    <dt>Mood</dt>
                                    <dd className='dpm-control'>
                                        <span>{musicPrompt.mood}</span>
                                        <select 
                                            className="dpm-mood-select"
                                            value={musicPrompt.mood}
                                            onChange={(e) => handleDPMChange('mood', e.target.value)}
                                            aria-label="Change music mood"
                                            disabled={isDPMUpdating}>
                                            <option value={musicPrompt.mood} disabled>{musicPrompt.mood}</option>
                                            {musicPrompt.moodVariations
                                                .filter(m => m !== musicPrompt.mood)
                                                .map(m => <option key={m} value={m}>{m}</option>
                                            )}
                                        </select>
                                    </dd>
                                    <dt>Tempo</dt>
                                    <dd className='dpm-control'>
                                      <input 
                                        type="range"
                                        min="60"
                                        max="180"
                                        value={musicPrompt.tempoBPM.split('-')[0]} // Handle ranges like '110-120'
                                        className="dpm-slider"
                                        onChange={(e) => handleDPMChange('tempoBPM', e.target.value)}
                                        aria-label="Change music tempo"
                                        disabled={isDPMUpdating}
                                        />
                                        <span className='dpm-tempo-value'>{musicPrompt.tempoBPM} BPM</span>
                                    </dd>
                                    <dt>Key Elements</dt>
                                    <dd>
                                        <ul>
                                            {musicPrompt.keyElements.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    </dd>
                                    <dt>Instrumentation</dt>
                                    <dd>
                                        <ul>
                                            {musicPrompt.instrumentation.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    </dd>
                                    <dt>Structure</dt>
                                    <dd>{musicPrompt.structureAndArrangement}</dd>
                                    <dt>FX/Production</dt>
                                    <dd>
                                        <ul>
                                            {musicPrompt.fxAndProductionNotes.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    </dd>
                                </dl>
                                <div className="full-prompt-section">
                                    <h4 className="final-prompt-header">
                                        Final Prompt
                                        {isDPMUpdating && <div className='spinner-small dpm-loader' aria-label='Updating prompt...'></div>}
                                    </h4>
                                    <p>{musicPrompt.finalPrompt}</p>
                                </div>
                            </div>


                             <div className="music-prompt-refiner-section">
                                <div className="optimizer-input-group">
                                    <input
                                        type="text"
                                        className="optimizer-input"
                                        placeholder="Refine final prompt..."
                                        value={musicPromptRefinementInstruction}
                                        onChange={(e) => setMusicPromptRefinementInstruction(e.target.value)}
                                        disabled={isMusicPromptRefining}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRefineMusicPrompt()}
                                    />
                                    <button
                                        className="optimizer-button"
                                        onClick={handleRefineMusicPrompt}
                                        disabled={isMusicPromptRefining || !musicPromptRefinementInstruction.trim()}
                                    >
                                        {isMusicPromptRefining ? 'Refining...' : 'Refine'}
                                    </button>
                                </div>
                                {originalMusicPrompt && musicPrompt.finalPrompt !== originalMusicPrompt.finalPrompt && (
                                    <button className="revert-button" onClick={handleRevertMusicPrompt}>
                                        Revert to Original Music Prompt
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {promptHistory.length > 0 && (
            <div className="card">
                <div className="history-section">
                    <div className="history-header">
                        <h2>History</h2>
                        <button onClick={handleClearHistory} className="clear-button">
                            Clear All
                        </button>
                    </div>
                    <ul className="history-list">
                        {promptHistory.map((prompt, index) => (
                            <li 
                                key={index} 
                                className="history-item" 
                                onClick={() => handleHistoryItemClick(prompt)}
                                title="Click to load this prompt"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && handleHistoryItemClick(prompt)}
                            >
                                <p className="history-prompt-text">{prompt.fullPrompt}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);