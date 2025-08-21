import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, getDocs, writeBatch, doc } from 'firebase/firestore';

// --- GLOBALS (Provided by the environment) ---
// These would be provided in a real environment. 
// IMPORTANT: Replace placeholders with your actual Firebase project configuration.
const __app_id = 'luxe-salon-app-guest';
const __firebase_config = JSON.stringify({
  apiKey: "AIzaSyDu6CupM_f8AeKqXDlou2IyWNvjquuIusE",
  authDomain: "luxesaloon-ce851.firebaseapp.com",
  projectId: "luxesaloon-ce851",
  storageBucket: "luxesaloon-ce851.firebasestorage.app",
  messagingSenderId: "543868154155",
  appId: "1:543868154155:web:fd3a2b91ca8d67e5c1556e"
});

// --- Firebase Initialization ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Helper Components ---
const Spinner = () => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pink-500"></div>
    </div>
);

// --- Icon Components ---
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v2.586l1.707-1.707a1 1 0 111.414 1.414L12.414 8H15a1 1 0 110 2h-2.586l1.707 1.707a1 1 0 11-1.414 1.414L11 11.414V14a1 1 0 11-2 0v-2.586l-1.707 1.707a1 1 0 11-1.414-1.414L7.586 10H5a1 1 0 110-2h2.586L5.793 6.293a1 1 0 011.414-1.414L9 6.586V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;


// --- Page Components ---

const HomePage = () => (
    <div>
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-6">Welcome to Luxe Salon!</h2>
        <p className="text-lg text-gray-600 mb-8">Experience the art of beautiful hair. Our talented stylists are here to help you look and feel your best.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
                <h3 className="font-semibold text-xl text-pink-600 mb-2">Our Services</h3>
                <p className="text-gray-600">Explore our wide range of services, from classic cuts and styling to the latest color trends and treatments. We use only premium products to ensure stunning, healthy results.</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
                <h3 className="font-semibold text-xl text-pink-600 mb-2">Expert Stylists</h3>
                <p className="text-gray-600">Our team of passionate and experienced stylists is dedicated to crafting the perfect look for you. Your satisfaction is our highest priority.</p>
            </div>
        </div>
    </div>
);

const BookingPage = () => {
    // Form state
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerMobile, setCustomerMobile] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedService, setSelectedService] = useState('');
    const [selectedStylist, setSelectedStylist] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    
    // App state
    const [services, setServices] = useState([]);
    const [stylists, setStylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastBookedService, setLastBookedService] = useState(null);

    // Gemini API Feature State
    const [serviceDescription, setServiceDescription] = useState('');
    const [isSuggestingService, setIsSuggestingService] = useState(false);
    const [suggestionError, setSuggestionError] = useState('');
    const [isEnhancingNote, setIsEnhancingNote] = useState(false);
    const [isGettingTips, setIsGettingTips] = useState(false);
    const [aftercareTips, setAftercareTips] = useState('');


    // Fetch services and stylists from Firestore
    useEffect(() => {
        const servicesUnsub = onSnapshot(collection(db, `artifacts/${appId}/public/data/services`), (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const stylistsUnsub = onSnapshot(collection(db, `artifacts/${appId}/public/data/stylists`), (snapshot) => {
            setStylists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => {
            servicesUnsub();
            stylistsUnsub();
        };
    }, []);

    // --- Gemini API Integration ---
    const callGeminiAPI = async (prompt, maxRetries = 3) => {
        const apiKey = ""; // Canvas will provide the key
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        };

        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`API call failed with status: ${response.status}`);
                }

                const result = await response.json();
                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    return result.candidates[0].content.parts[0].text.trim();
                } else {
                    throw new Error("Invalid response structure from API.");
                }
            } catch (err) {
                if (i === maxRetries - 1) throw err;
                await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i))); // Exponential backoff
            }
        }
    };

    const handleGetServiceSuggestion = async () => {
        if (!serviceDescription) {
            setSuggestionError('Please describe what you are looking for.');
            return;
        }
        setIsSuggestingService(true);
        setSuggestionError('');
        setError('');

        const servicesList = services.map(s => `ID: "${s.id}", Name: "${s.name}"`).join('; ');
        const prompt = `From the following list of salon services: [${servicesList}], which service ID is the best match for this customer request: "${serviceDescription}"? Respond with only the service ID in quotes, for example: "serviceIdGoesHere". Do not add any other text.`;

        try {
            const suggestedId = await callGeminiAPI(prompt);
            const cleanId = suggestedId.replace(/"/g, ''); // Remove quotes from response
            const isValidId = services.some(s => s.id === cleanId);
            
            if (isValidId) {
                setSelectedService(cleanId);
            } else {
                setSuggestionError("Sorry, I couldn't find a matching service. Please select one manually.");
            }
        } catch (err) {
            console.error("Service suggestion error:", err);
            setSuggestionError("Could not get suggestion. Please try again or select manually.");
        } finally {
            setIsSuggestingService(false);
        }
    };

    const handleEnhanceNote = async () => {
        if (!notes) return;
        setIsEnhancingNote(true);
        setError('');

        const prompt = `You are a helpful salon assistant. A customer wrote this note for their stylist: "${notes}". Politely expand this into a more detailed and descriptive note to ensure the stylist understands the customer's wishes.`;
        
        try {
            const enhancedNote = await callGeminiAPI(prompt);
            setNotes(enhancedNote);
        } catch (err) {
            console.error("Note enhancement error:", err);
            setError("Could not enhance note. Please try again.");
        } finally {
            setIsEnhancingNote(false);
        }
    };
    
    const handleGetAftercareTips = async () => {
        if (!lastBookedService) return;
        setIsGettingTips(true);
        setAftercareTips('');
        setError('');

        const prompt = `Provide simple, personalized aftercare tips for a salon customer who just received a "${lastBookedService}" service. The tips should be easy to follow at home. Format the response as a friendly message with a bulleted or numbered list.`;

        try {
            const tips = await callGeminiAPI(prompt);
            setAftercareTips(tips.replace(/\*/g, '•')); // Replace markdown asterisks with bullets
        } catch (err) {
            console.error("Aftercare tips error:", err);
            setError("Could not get aftercare tips at this time. Please try again.");
        } finally {
            setIsGettingTips(false);
        }
    };


    const handleBooking = async (e) => {
        e.preventDefault();
        if (!customerName || !customerEmail || !customerMobile || !selectedService || !selectedStylist || !selectedDate || !selectedTime) {
            setError('Please fill in all required fields.');
            return;
        }
        setError('');
        setSuccess('');
        setAftercareTips('');
        setIsSubmitting(true);

        try {
            const service = services.find(s => s.id === selectedService);
            const stylist = stylists.find(s => s.id === selectedStylist);
            const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`);
            
            await addDoc(collection(db, `artifacts/${appId}/public/data/appointments`), {
                customerName,
                customerEmail,
                customerMobile,
                notes,
                serviceId: selectedService,
                serviceName: service.name,
                stylistId: selectedStylist,
                stylistName: stylist.name,
                appointmentTime: appointmentDateTime,
                status: 'booked',
                createdAt: new Date(),
            });

            setSuccess('Appointment booked successfully! We look forward to seeing you.');
            setLastBookedService(service.name);
            // Reset form
            setCustomerName('');
            setCustomerEmail('');
            setCustomerMobile('');
            setNotes('');
            setSelectedService('');
            setSelectedStylist('');
            setSelectedDate('');
            setSelectedTime('');
            setServiceDescription('');

        } catch (err) {
            console.error("Booking error:", err);
            setError('Failed to book appointment. Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <Spinner />;

    return (
        <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-6">Book an Appointment</h2>
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg max-w-3xl mx-auto">
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}
                
                {success ? (
                    <div className="text-center">
                        <p className="bg-green-100 text-green-700 p-4 rounded-md mb-4 text-base">{success}</p>
                        <div className="mt-6">
                             <button type="button" onClick={handleGetAftercareTips} disabled={isGettingTips} className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:bg-pink-300 flex items-center justify-center gap-2 mx-auto">
                                {isGettingTips ? 'Generating...' : `✨ Get Aftercare Tips for ${lastBookedService}`}
                            </button>
                            {isGettingTips && <Spinner />}
                            {aftercareTips && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left whitespace-pre-wrap">
                                    <h4 className="font-semibold text-gray-800 mb-2">Here are your personalized tips:</h4>
                                    <p className="text-gray-600">{aftercareTips}</p>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setSuccess('')} className="mt-6 text-pink-600 font-semibold hover:underline">Book Another Appointment</button>
                    </div>
                ) : (
                    <form onSubmit={handleBooking} className="space-y-6">
                        {/* Customer Details Section */}
                        <fieldset className="border p-4 rounded-lg">
                            <legend className="px-2 font-semibold text-gray-700">Your Details</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Full Name*</label>
                                    <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-pink-500 focus:border-pink-500" required />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Email Address*</label>
                                    <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-pink-500 focus:border-pink-500" required />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Mobile Number*</label>
                                    <input type="tel" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-pink-500 focus:border-pink-500" required />
                                </div>
                            </div>
                        </fieldset>
                        
                        {/* AI Service Suggester */}
                        <fieldset className="border p-4 rounded-lg bg-pink-50/50">
                            <legend className="px-2 font-semibold text-gray-700 flex items-center gap-2">
                                <SparklesIcon /> AI Service Suggester
                            </legend>
                            <div className="mt-2">
                                <label className="block text-gray-600 font-medium mb-2 text-sm">Describe the look or treatment you want:</label>
                                <textarea value={serviceDescription} onChange={e => setServiceDescription(e.target.value)} rows="2" placeholder="e.g., 'I want a fresh look for summer that's easy to manage'" className="w-full p-3 border rounded-lg bg-white focus:ring-pink-500 focus:border-pink-500"></textarea>
                                <button type="button" onClick={handleGetServiceSuggestion} disabled={isSuggestingService} className="mt-2 w-full md:w-auto bg-white border border-pink-500 text-pink-500 font-bold py-2 px-4 rounded-lg transition duration-300 hover:bg-pink-500 hover:text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:border-gray-300 flex items-center justify-center gap-2">
                                    {isSuggestingService ? 'Thinking...' : '✨ Get Suggestion'}
                                </button>
                                {suggestionError && <p className="text-red-600 text-sm mt-2">{suggestionError}</p>}
                            </div>
                        </fieldset>

                        {/* Appointment Details Section */}
                        <fieldset className="border p-4 rounded-lg">
                            <legend className="px-2 font-semibold text-gray-700">Appointment Details</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Select Service*</label>
                                    <select value={selectedService} onChange={e => setSelectedService(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-pink-500 focus:border-pink-500" required>
                                        <option value="">Choose a service...</option>
                                        {services.map(s => <option key={s.id} value={s.id}>{s.name} - ₹{s.price} ({s.duration} min)</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Select Stylist*</label>
                                    <select value={selectedStylist} onChange={e => setSelectedStylist(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-pink-500 focus:border-pink-500" required>
                                        <option value="">Choose a stylist...</option>
                                        {stylists.map(s => <option key={s.id} value={s.id}>{s.name} - {s.specialty}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Date*</label>
                                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-pink-500 focus:border-pink-500" required />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Time*</label>
                                    <input type="time" min="07:00" max="22:00" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-pink-500 focus:border-pink-500" required />
                                    <p className="text-xs text-gray-500 mt-1">Salon hours: 7:00 AM - 10:00 PM</p>
                                </div>
                            </div>
                        </fieldset>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Notes for your Stylist (Optional)</label>
                            <div className="relative">
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="3" placeholder="Any specific requests or information?" className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-pink-500 focus:border-pink-500"></textarea>
                                <button type="button" onClick={handleEnhanceNote} disabled={isEnhancingNote || !notes} className="absolute bottom-2 right-2 bg-pink-100 text-pink-600 px-3 py-1 text-sm font-semibold rounded-md hover:bg-pink-200 transition-colors disabled:bg-gray-100 disabled:text-gray-400 flex items-center gap-1">
                                    {isEnhancingNote ? 'Improving...' : <>✨ Enhance</>}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-pink-300">
                            {isSubmitting ? 'Booking...' : 'Confirm Booking'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};


// --- Main App Component ---
function App() {
    const [activeView, setActiveView] = useState('home');

    // --- NEW: Function to add sample data to Firestore ---
    useEffect(() => {
        const addSampleData = async () => {
            try {
                // Check if services collection is empty
                const servicesCollectionRef = collection(db, `artifacts/${appId}/public/data/services`);
                const servicesSnapshot = await getDocs(servicesCollectionRef);
                if (servicesSnapshot.empty) {
                    console.log("No services found. Adding sample services...");
                    const batch = writeBatch(db);
                    
                    const sampleServices = [
                        { name: "Women's Haircut", price: 500, duration: 60 },
                        { name: "Men's Haircut", price: 150, duration: 45 },
                        { name: "Full Color", price: 1000, duration: 120 },
                        { name: "Kid's Haircut", price: 100, duration: 180 },
                        { name: "Head Massage", price: 400, duration: 45 },
                    ];

                    sampleServices.forEach(service => {
                        const newServiceRef = doc(servicesCollectionRef);
                        batch.set(newServiceRef, service);
                    });

                    // Check if stylists collection is empty
                    const stylistsCollectionRef = collection(db, `artifacts/${appId}/public/data/stylists`);
                    const stylistsSnapshot = await getDocs(stylistsCollectionRef);
                    if (stylistsSnapshot.empty) {
                        console.log("No stylists found. Adding sample stylists...");
                        const sampleStylists = [
                            { name: "Ramesh", specialty: "Color Expert" },
                            { name: "Suresh", specialty: "Creative Cuts" },
                            { name: "Harshal", specialty: "Styling & Updos" },
                        ];
                        sampleStylists.forEach(stylist => {
                            const newStylistRef = doc(stylistsCollectionRef);
                            batch.set(newStylistRef, stylist);
                        });
                    }

                    await batch.commit();
                    console.log("Sample data added successfully.");
                } else {
                    console.log("Data already exists. Skipping sample data creation.");
                }
            } catch (error) {
                console.error("Error adding sample data: ", error);
            }
        };

        addSampleData();
    }, []); // Runs once on component mount


    const navLinks = [
        { id: 'home', label: 'Home', icon: <HomeIcon /> },
        { id: 'book', label: 'Book Now', icon: <CalendarIcon /> },
    ];

    const renderContent = () => {
        switch (activeView) {
            case 'book':
                return <BookingPage />;
            case 'home':
            default:
                return <HomePage />;
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-pink-50 font-sans">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 bg-white shadow-md flex flex-col flex-shrink-0">
                <div className="p-6 text-center border-b md:border-b-0">
                    <h1 className="text-4xl font-bold text-pink-600">Luxe</h1>
                    <p className="text-sm text-gray-500 mt-1">Hair Salon</p>
                </div>
                <nav className="flex-1 px-4 py-2">
                    <ul className="flex flex-row md:flex-col justify-center md:justify-start">
                        {navLinks.map(link => (
                            <li key={link.id} className="mx-1 md:mx-0">
                                <button
                                    onClick={() => setActiveView(link.id)}
                                    className={`flex items-center justify-center md:justify-start w-full px-4 py-3 my-1 rounded-lg transition-colors duration-200 ${activeView === link.id ? 'bg-pink-100 text-pink-600' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <span className="mr-0 md:mr-3">{link.icon}</span>
                                    <span className="hidden md:inline">{link.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-10 overflow-y-auto">
                {renderContent()}
            </main>
        </div>
    );
}

export default App;
