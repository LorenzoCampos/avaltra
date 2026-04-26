package recurrence

import (
	"testing"
	"time"
)

func TestShouldOccurOnDate(t *testing.T) {
	day31 := 31
	feb29 := 29
	friday := 5
	intervalLimit := 3

	tests := []struct {
		name     string
		template Template
		date     time.Time
		want     bool
	}{
		{
			name: "monthly day 31 clamps to last day of month",
			template: Template{
				IsActive:             true,
				RecurrenceFrequency:  "monthly",
				RecurrenceInterval:   1,
				RecurrenceDayOfMonth: &day31,
				StartDate:            date(2026, time.January, 31),
			},
			date: date(2026, time.April, 30),
			want: true,
		},
		{
			name: "yearly february 29 clamps to february 28 on non leap year",
			template: Template{
				IsActive:             true,
				RecurrenceFrequency:  "yearly",
				RecurrenceInterval:   1,
				RecurrenceDayOfMonth: &feb29,
				StartDate:            date(2024, time.February, 29),
			},
			date: date(2025, time.February, 28),
			want: true,
		},
		{
			name: "respects start date",
			template: Template{
				IsActive:            true,
				RecurrenceFrequency: "daily",
				RecurrenceInterval:  1,
				StartDate:           date(2026, time.April, 20),
			},
			date: date(2026, time.April, 19),
			want: false,
		},
		{
			name: "respects end date",
			template: Template{
				IsActive:            true,
				RecurrenceFrequency: "daily",
				RecurrenceInterval:  1,
				StartDate:           date(2026, time.April, 1),
				EndDate:             datePtr(2026, time.April, 14),
			},
			date: date(2026, time.April, 15),
			want: false,
		},
		{
			name: "respects total occurrences limit",
			template: Template{
				IsActive:            true,
				RecurrenceFrequency: "weekly",
				RecurrenceInterval:  1,
				RecurrenceDayOfWeek: &friday,
				StartDate:           date(2026, time.April, 3),
				TotalOccurrences:    &intervalLimit,
				CurrentOccurrence:   3,
			},
			date: date(2026, time.April, 24),
			want: false,
		},
		{
			name: "ignores inactive templates",
			template: Template{
				IsActive:            false,
				RecurrenceFrequency: "daily",
				RecurrenceInterval:  1,
				StartDate:           date(2026, time.April, 1),
			},
			date: date(2026, time.April, 14),
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ShouldOccurOnDate(tt.template, tt.date)
			if got != tt.want {
				t.Fatalf("ShouldOccurOnDate() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNextOccurrenceWithinWindow(t *testing.T) {
	friday := 5
	template := Template{
		IsActive:            true,
		RecurrenceFrequency: "weekly",
		RecurrenceInterval:  1,
		RecurrenceDayOfWeek: &friday,
		StartDate:           date(2026, time.April, 3),
	}

	occurrence, ok := NextOccurrenceWithinWindow(template, date(2026, time.April, 14), 7)
	if !ok {
		t.Fatal("expected occurrence within window")
	}

	if got, want := occurrence.Format("2006-01-02"), "2026-04-17"; got != want {
		t.Fatalf("NextOccurrenceWithinWindow() = %s, want %s", got, want)
	}
}

func date(year int, month time.Month, day int) time.Time {
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}

func datePtr(year int, month time.Month, day int) *time.Time {
	value := date(year, month, day)
	return &value
}
