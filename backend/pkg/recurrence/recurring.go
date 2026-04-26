package recurrence

import "time"

// Template defines the recurrence data needed to calculate occurrences.
type Template struct {
	IsActive             bool
	RecurrenceFrequency  string
	RecurrenceInterval   int
	RecurrenceDayOfMonth *int
	RecurrenceDayOfWeek  *int
	StartDate            time.Time
	EndDate              *time.Time
	TotalOccurrences     *int
	CurrentOccurrence    int
}

// ShouldOccurOnDate determines whether the template has an occurrence on the given date.
func ShouldOccurOnDate(template Template, date time.Time) bool {
	date = normalizeDate(date)
	startDate := normalizeDate(template.StartDate)

	if !template.IsActive {
		return false
	}

	if template.RecurrenceInterval <= 0 {
		return false
	}

	if date.Before(startDate) {
		return false
	}

	if template.EndDate != nil && date.After(normalizeDate(*template.EndDate)) {
		return false
	}

	if template.TotalOccurrences != nil && template.CurrentOccurrence >= *template.TotalOccurrences {
		return false
	}

	switch template.RecurrenceFrequency {
	case "daily":
		daysSinceStart := int(date.Sub(startDate).Hours() / 24)
		return daysSinceStart%template.RecurrenceInterval == 0

	case "weekly":
		if template.RecurrenceDayOfWeek == nil {
			return false
		}

		if int(date.Weekday()) != *template.RecurrenceDayOfWeek {
			return false
		}

		weeksSinceStart := int(date.Sub(startDate).Hours() / (24 * 7))
		return weeksSinceStart%template.RecurrenceInterval == 0

	case "monthly":
		if template.RecurrenceDayOfMonth == nil {
			return false
		}

		targetDay := clampDayOfMonth(*template.RecurrenceDayOfMonth, date.Year(), date.Month())
		if date.Day() != targetDay {
			return false
		}

		monthsSinceStart := (date.Year()-startDate.Year())*12 + int(date.Month()-startDate.Month())
		return monthsSinceStart%template.RecurrenceInterval == 0

	case "yearly":
		if template.RecurrenceDayOfMonth == nil {
			return false
		}

		if date.Month() != startDate.Month() {
			return false
		}

		targetDay := clampDayOfMonth(*template.RecurrenceDayOfMonth, date.Year(), date.Month())
		if date.Day() != targetDay {
			return false
		}

		yearsSinceStart := date.Year() - startDate.Year()
		return yearsSinceStart%template.RecurrenceInterval == 0

	default:
		return false
	}
}

// NextOccurrenceWithinWindow returns the next occurrence on or after fromDate within the given window.
func NextOccurrenceWithinWindow(template Template, fromDate time.Time, windowDays int) (*time.Time, bool) {
	if windowDays < 0 {
		return nil, false
	}

	start := normalizeDate(fromDate)
	for dayOffset := 0; dayOffset <= windowDays; dayOffset++ {
		candidate := start.AddDate(0, 0, dayOffset)
		if ShouldOccurOnDate(template, candidate) {
			occurrence := candidate
			return &occurrence, true
		}
	}

	return nil, false
}

func clampDayOfMonth(day int, year int, month time.Month) int {
	lastDayOfMonth := time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
	if day > lastDayOfMonth {
		return lastDayOfMonth
	}

	return day
}

func normalizeDate(date time.Time) time.Time {
	return time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
}
