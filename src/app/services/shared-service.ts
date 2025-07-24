import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  
  getInitials(fullName: string): string {
    if (!fullName) return '';

    const words = fullName.trim().split(/\s+/);
    const count = words.length;

    if (count === 1) {
      return words[0].charAt(0).toUpperCase();
    }

    if (count === 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return (words[0].charAt(0) + words[count - 1].charAt(0)).toUpperCase();
  }

  private avatarColors: { [key: string]: string } = {};
  getRandomColor(item: any): string {
    const key = item?._id || item?.firstName || item?.lastName;

    if (!key) {
      return '#9e9e9e';
    }

    if (!this.avatarColors[key]) {
      const colors = [
        '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
        '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
        '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
        '#ff5722', '#795548', '#607d8b', '#9e9e9e', '#bdbdbd'
      ];
      const randomIndex = Math.floor(Math.random() * colors.length);
      this.avatarColors[key] = colors[randomIndex];
    }

    return this.avatarColors[key];
  }
}
