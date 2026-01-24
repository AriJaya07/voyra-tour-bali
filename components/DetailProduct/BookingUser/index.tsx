"use client"

import { useState, useEffect } from 'react'
import WhatappIcon from '../../../public/sosmed/WhatappIcon'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

export default function BookingUser() {
    const [date, setDate] = useState<Date | null>(null)  // Initial state is null
    const [quantity, setQuantity] = useState(1)
    const [isModalOpen, setIsModalOpen] = useState(false)  // Modal visibility state
    const [message, setMessage] = useState('I would like to book the entrance ticket to GWK Cultural Park for {quantity} person(s) on {date}.')  // Pre-filled template message

    // Set the date after the component mounts (client-side)
    useEffect(() => {
        setDate(new Date())
    }, [])

    const handleDateChange = (value: Date | null) => {
        setDate(value)
    }

    const incrementQuantity = () => {
        setQuantity((prevQuantity) => prevQuantity + 1)
    }

    const decrementQuantity = () => {
        if (quantity > 1) {
            setQuantity((prevQuantity) => prevQuantity - 1)
        }
    }

    const handleSendMessage = () => {
        // Simulate sending a message (you can integrate actual WhatsApp API or link here)
        // alert(`Message Sent: ${message}`);
        setIsModalOpen(false);  // Close modal after sending
    }

    return (
        <div className="border border-[#E6E6E6] rounded-[16px] p-[25px] mt-[88px]">
            <div className="flex flex-col">
                <div className="flex flex-row justify-between">
                    <p className="text-[16px] font-bold leading-[24px] text-black">GWK Cultural Park · Entrance Ticket</p>
                    {/* Icon can go here */}
                </div>
                <div className="pt-[100px] pb-[20px]">
                    <p className="text-[#333333] text-[18px] leading-[27px] font-bold">Select date & quantity</p>
                    <p className="text-[16px] font-normal leading-[24px] text-black">You can redeem this package on any…</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Calendar Section - Centered on Mobile */}
                    <div className="flex flex-col sm:w-[50%] justify-center items-center sm:items-start">
                        <Calendar
                            onChange={handleDateChange as any}
                            value={date}
                            className="sm:w-full w-[90%]"
                            // Format the date in a consistent manner (e.g., using `toLocaleDateString`)
                            tileContent={({ date, view }) => {
                                if (view === 'month') {
                                    return (
                                        <abbr aria-label={date.toLocaleDateString('id-ID')}>
                                            {date.getDate()}
                                        </abbr>
                                    )
                                }
                            }}
                        />
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex flex-col justify-between sm:w-[50%] gap-3">
                        <div className='flex flex-col gap-5'>
                            <p className="text-[16px] font-normal leading-[24px] text-black">Select quantity</p>
                            <div className="flex flex-row justify-between items-center">
                                <p className="text-[#A8A8A8] text-[14px] font-normal leading-[24px]">Person</p>
                                <div className="flex flex-row gap-3 items-center">
                                    <button onClick={decrementQuantity} className="text-[#A8A8A8] text-[14px] font-normal leading-[24px]">-</button>
                                    <p className="text-[#A8A8A8] text-[14px] font-normal leading-[24px]">{quantity}</p>
                                    <button onClick={incrementQuantity} className="text-[#A8A8A8] text-[14px] font-normal leading-[24px]">+</button>
                                </div>
                            </div>
                        </div>
                        <div className="border bg-[#EEEEEE] rounded-[13px] flex flex-col gap-3 p-[16px]">
                            <div className="">
                            <p className="font-bold text-[16px] leading-[24px] font-medium">
                                Rp. {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(quantity * 780000)}
                            </p>
                            </div>
                            <div className=''>
                                <button 
                                    type='button' 
                                    className='bg-[#5FD668] w-full h-[40px] flex justify-center items-center rounded-xl cursor-pointer'
                                    onClick={() => setIsModalOpen(true)}  // Open modal on click
                                >
                                    <WhatappIcon />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-xl p-8 w-[90%] sm:w-[600px] relative">
                        {/* Close Button (X) */}
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-2 right-2 text-xl text-gray-700 cursor-pointer pr-4"
                        >
                            &times;
                        </button>

                        <h2 className="text-lg font-bold mb-4">Send Your Booking Request</h2>
                        
                        {/* Editable message */}
                        <textarea
                            className="w-full h-[150px] border rounded-lg p-2 mb-4"
                            placeholder="Enter your booking message here..."
                            value={message.replace("{quantity}", quantity.toString()).replace("{date}", date ? date.toLocaleDateString() : "")}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        
                        <div className="flex justify-center">
                            <button 
                                onClick={handleSendMessage} 
                                className="bg-[#5FD668] text-white py-2 px-4 rounded-lg cursor-pointer"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
