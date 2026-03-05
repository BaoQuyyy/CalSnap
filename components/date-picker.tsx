// Selected Date component
import React from 'react';

// date picking logic
import { useCalendar } from './calendar';
import { Day } from './day';

const DatePicker = () => {
    const { selectedDate, onDateChange } = useCalendar();

    return (
        <div>
            <input type='date' value={selectedDate.toISOString().split('T')[0]} onChange={(event) => onDateChange(new Date(event.target.value))} />
            <div className='calendar'>
                {/** Calendar days will be rendered here **/}
                {[...Array(30).keys()].map((day) => (
                    <Day key={day} date={new Date(2021, 9, day + 1)} onDateClick={onDateChange} />
                ))}
            </div>
        </div>
    );
};

export default DatePicker;